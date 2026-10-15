import type { AppState, Out, Payment, Reservation, ReservationStatus, Station } from '../types';
import { assert } from './errors';
import { CONFIRMED_GRACE_AFTER_SLOT_MIN, GST_RATE, PENDING_PAYMENT_TTL_MIN, isActiveReservation } from './constants';
import { isReservable } from './batteryService';
import { notify } from './notificationService';
import { uniqueId } from '../utils/format';

export interface FeeBreakdown { base: number; gst: number; total: number }

export function computeFee(station: Station): FeeBreakdown {
  const gst = Math.round(station.pricePerSwap * GST_RATE * 100) / 100;
  return { base: station.pricePerSwap, gst, total: Math.round(station.pricePerSwap + gst) };
}

export interface SlotOption { iso: string; remaining: number }

/** Demo slots: hourly, 09:00–19:00, today and tomorrow. Today's slots must be ≥30 min in the future. */
export function generateSlots(state: AppState, stationId: string, now = new Date()): SlotOption[] {
  const station = state.stations.find((s) => s.id === stationId);
  if (!station) return [];
  const out: SlotOption[] = [];
  for (let day = 0; day < 2; day++) {
    for (let hour = 9; hour <= 19; hour++) {
      const d = new Date(now);
      d.setDate(d.getDate() + day);
      d.setHours(hour, 0, 0, 0);
      if (d.getTime() < now.getTime() + 30 * 60000) continue;
      const iso = d.toISOString();
      const taken = state.reservations.filter((r) => r.stationId === stationId && r.slot === iso && isActiveReservation(r)).length;
      out.push({ iso, remaining: Math.max(0, station.slotCapacity - taken) });
    }
  }
  return out;
}

export interface ReserveInput {
  ownerId: string;
  vehicleId: string;
  stationId: string;
  batteryId: string;
  slot: string;
}

const inMinutes = (iso: string | number, min: number) => new Date(new Date(iso).getTime() + min * 60000).toISOString();

/**
 * createReservation(): creates a reservation and immediately locks the battery (FULLY_CHARGED → RESERVED).
 * That lock is what prevents double-booking: the next caller sees a non-FULLY_CHARGED battery and is rejected.
 */
export function createReservation(state: AppState, input: ReserveInput): Out<Reservation> {
  const vehicle = state.vehicles.find((v) => v.id === input.vehicleId && v.ownerId === input.ownerId);
  assert(vehicle, 'Please select one of your vehicles.');
  const station = state.stations.find((s) => s.id === input.stationId);
  assert(station, 'Please select a station.');
  assert(station.status === 'OPEN', `${station.name} is currently ${station.status.toLowerCase()} and cannot take reservations.`);
  assert(station.supportedBatteryTypes.includes(vehicle.batteryType), `${station.name} does not support ${vehicle.batteryType} batteries.`);

  assert(
    !state.reservations.some((r) => r.vehicleId === vehicle.id && isActiveReservation(r)),
    `${vehicle.registrationNumber} already has an active reservation. Complete or cancel it first.`,
  );

  const battery = state.batteries.find((b) => b.id === input.batteryId);
  assert(battery, 'Please select a battery.');
  assert(battery.stationId === station.id, 'That battery belongs to a different station.');
  assert(battery.batteryType === vehicle.batteryType, `Battery ${battery.id} (${battery.batteryType}) is not compatible with your vehicle (${vehicle.batteryType}).`);
  assert(
    isReservable(state, battery),
    `Battery ${battery.id} is no longer available (status: ${battery.status}). Please choose another battery.`,
  );

  const slot = generateSlots(state, station.id).find((s) => s.iso === input.slot);
  assert(slot, 'Please choose a valid upcoming time slot.');
  assert(slot.remaining > 0, 'That time slot is full. Please choose another.');

  const id = uniqueId('RSV', state.reservations.map((r) => r.id)); // rule 3: unique IDs
  const now = new Date().toISOString();
  const reservation: Reservation = {
    id,
    ownerId: input.ownerId,
    stationId: station.id,
    vehicleId: vehicle.id,
    batteryId: battery.id,
    slot: input.slot,
    createdAt: now,
    status: 'PENDING_PAYMENT',
    paymentStatus: 'PENDING',
    estimatedFee: computeFee(station).total,
    qrCode: `VS:${id}:${uniqueId('', [], false).slice(1, 7)}`,
    expiresAt: inMinutes(now, PENDING_PAYMENT_TTL_MIN),
  };
  const next: AppState = {
    ...state,
    reservations: [reservation, ...state.reservations],
    batteries: state.batteries.map((b) => (b.id === battery.id ? { ...b, status: 'RESERVED' } : b)),
  };
  return {
    state: notify(next, input.ownerId, 'Reservation created',
      `Battery ${battery.id} is held for you at ${station.name}. Complete payment within ${PENDING_PAYMENT_TTL_MIN} minutes to confirm reservation ${id}.`,
      { reservationId: id }),
    result: reservation,
  };
}

export function canCancel(state: AppState, r: Reservation): boolean {
  return isActiveReservation(r) && !state.swaps.some((s) => s.reservationId === r.id && s.status === 'IN_PROGRESS');
}

/**
 * Shared by cancel and expiry (state chart: RESERVED → FULLY_CHARGED on "Cancel / Expire").
 * Releases the battery and settles any payment (simulated refund of a successful digital payment).
 */
function releaseReservation(state: AppState, r: Reservation, status: Extract<ReservationStatus, 'CANCELLED' | 'EXPIRED'>): AppState {
  let paymentStatus = r.paymentStatus;
  const payments: Payment[] = state.payments.map((p) => {
    if (p.reservationId !== r.id) return p;
    if (p.status === 'SUCCESS') { paymentStatus = 'REFUNDED'; return { ...p, status: 'REFUNDED' as const }; }
    if (p.status === 'PENDING') return { ...p, status: 'CANCELLED' as const };
    return p;
  });
  const released: AppState = {
    ...state,
    payments,
    reservations: state.reservations.map((x) => (x.id === r.id ? { ...x, status, paymentStatus } : x)),
    batteries: state.batteries.map((b) => (b.id === r.batteryId && b.status === 'RESERVED' ? { ...b, status: 'FULLY_CHARGED' } : b)),
  };
  const refunded = paymentStatus === 'REFUNDED' ? ' Your payment has been refunded (simulated).' : '';
  return notify(released, r.ownerId,
    status === 'CANCELLED' ? 'Reservation cancelled' : 'Reservation expired',
    status === 'CANCELLED'
      ? `Reservation ${r.id} was cancelled and the battery released.${refunded}`
      : `Reservation ${r.id} expired and the battery was released.${refunded}`,
    { reservationId: r.id, email: true, sms: status === 'EXPIRED' });
}

/** Rule 4: cancelling an eligible reservation releases its battery. */
export function cancelReservation(state: AppState, reservationId: string): Out<Reservation> {
  const r = state.reservations.find((x) => x.id === reservationId);
  assert(r, 'Reservation not found.');
  assert(isActiveReservation(r), `A ${r.status.toLowerCase().replace('_', ' ')} reservation cannot be cancelled.`);
  assert(canCancel(state, r), 'This reservation is being served at the station right now and cannot be cancelled.');
  const next = releaseReservation(state, r, 'CANCELLED');
  return { state: next, result: next.reservations.find((x) => x.id === r.id)! };
}

/**
 * Expires reservations whose deadline passed (unpaid after 15 min, or slot + 60 min without a swap).
 * Run on app load, on a timer, and before every action. Returns the number of reservations expired.
 */
export function expireStale(state: AppState, now = new Date()): Out<number> {
  let next = state;
  let count = 0;
  for (const r of state.reservations) {
    if (!isActiveReservation(r) || new Date(r.expiresAt).getTime() > now.getTime()) continue;
    if (!canCancel(next, r)) continue; // a swap in progress is never expired under the operator's hands
    next = releaseReservation(next, r, 'EXPIRED');
    count++;
  }
  return { state: next, result: count };
}

/** Called when payment succeeds: the reservation now lives until slot + 60 min. */
export const confirmedExpiry = (slot: string) => inMinutes(slot, CONFIRMED_GRACE_AFTER_SLOT_MIN);
