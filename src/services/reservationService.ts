import type { AppState, Out, Reservation, Station } from '../types';
import { assert } from './errors';
import { GST_RATE, isActiveReservation } from './constants';
import { isReservable } from './inventoryService';
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

/**
 * Creates a reservation and immediately locks the battery (status RESERVED), which is what
 * prevents double-booking: the next caller sees status !== AVAILABLE and is rejected.
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

  const reservation: Reservation = {
    id: uniqueId('RSV', state.reservations.map((r) => r.id)), // rule 3: unique IDs
    ownerId: input.ownerId,
    stationId: station.id,
    vehicleId: vehicle.id,
    batteryId: battery.id,
    slot: input.slot,
    createdAt: new Date().toISOString(),
    status: 'PENDING_PAYMENT',
    paymentStatus: 'PENDING',
    estimatedFee: computeFee(station).total,
  };
  return {
    state: {
      ...state,
      reservations: [reservation, ...state.reservations],
      batteries: state.batteries.map((b) => (b.id === battery.id ? { ...b, status: 'RESERVED' } : b)),
    },
    result: reservation,
  };
}

export function canCancel(state: AppState, r: Reservation): boolean {
  return isActiveReservation(r) && !state.swaps.some((s) => s.reservationId === r.id && s.status === 'IN_PROGRESS');
}

/** Rule 4: cancelling releases the battery to AVAILABLE and refunds a successful digital payment (simulated). */
export function cancelReservation(state: AppState, reservationId: string): Out<Reservation> {
  const r = state.reservations.find((x) => x.id === reservationId);
  assert(r, 'Reservation not found.');
  assert(isActiveReservation(r), `A ${r.status.toLowerCase()} reservation cannot be cancelled.`);
  assert(canCancel(state, r), 'This reservation is being served at the station right now and cannot be cancelled.');

  let paymentStatus = r.paymentStatus;
  const payments = state.payments.map((p) => {
    if (p.reservationId !== r.id) return p;
    if (p.status === 'SUCCESS') { paymentStatus = 'REFUNDED'; return { ...p, status: 'REFUNDED' as const }; }
    if (p.status === 'PENDING') return { ...p, status: 'CANCELLED' as const };
    return p;
  });
  const cancelled: Reservation = { ...r, status: 'CANCELLED', paymentStatus };
  return {
    state: {
      ...state,
      payments,
      reservations: state.reservations.map((x) => (x.id === r.id ? cancelled : x)),
      batteries: state.batteries.map((b) =>
        b.id === r.batteryId && b.status === 'RESERVED' ? { ...b, status: 'AVAILABLE' } : b,
      ),
    },
    result: cancelled,
  };
}
