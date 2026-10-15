import type { AppState, Out, Payment, Reservation, SwapSession } from '../types';
import { assert } from './errors';
import { notify } from './notificationService';
import { uniqueId } from '../utils/format';

/**
 * Rule 5: only a valid reservation may be verified at a station.
 * `input` is the scanned QR payload (VS:<reservationId>:<token>) or, as a fallback for customers without
 * a phone, a typed reservation ID. A QR payload must match the code issued for that reservation exactly.
 * Valid = exists, this station, payment settled (CONFIRMED), not completed/cancelled/expired,
 * and its reserved battery is still locked (RESERVED) and compatible with the vehicle.
 */
export function verifyReservation(state: AppState, stationId: string, input: string): Reservation {
  const raw = input.trim();
  assert(raw, 'Scan the QR code or enter a reservation ID.');
  let r: Reservation | undefined;
  if (/^VS:/i.test(raw)) {
    const parts = raw.split(':');
    r = state.reservations.find((x) => x.id.toUpperCase() === (parts[1] ?? '').toUpperCase());
    assert(r && r.qrCode.toUpperCase() === raw.toUpperCase(), 'Invalid QR code — it does not match any reservation.');
  } else {
    r = state.reservations.find((x) => x.id.toUpperCase() === raw.toUpperCase());
    assert(r, `No reservation found with ID ${raw.toUpperCase()}.`);
  }
  assert(r.stationId === stationId, `Reservation ${r.id} is for a different station and cannot be served here.`);
  switch (r.status) {
    case 'COMPLETED': throw new Error(`Reservation ${r.id} has already been completed. A swap cannot be completed twice.`);
    case 'CANCELLED': throw new Error(`Reservation ${r.id} was cancelled.`);
    case 'EXPIRED': throw new Error(`Reservation ${r.id} has expired.`);
    case 'PENDING_PAYMENT': throw new Error(`Reservation ${r.id} is not confirmed — payment is ${r.paymentStatus.toLowerCase()}. Ask the customer to complete payment first.`);
  }
  const vehicle = state.vehicles.find((v) => v.id === r.vehicleId);
  const battery = state.batteries.find((b) => b.id === r.batteryId);
  assert(vehicle && battery, 'Vehicle or battery record is missing for this reservation.');
  assert(battery.status === 'RESERVED', `Reserved battery ${battery.id} is ${battery.status}, not RESERVED. It cannot be handed over.`);
  assert(battery.batteryType === vehicle.batteryType, `Battery ${battery.id} (${battery.batteryType}) is incompatible with ${vehicle.registrationNumber} (${vehicle.batteryType}).`);
  return r;
}

/** After verification, open an IN_PROGRESS swap session (idempotent). */
export function startSwap(state: AppState, stationId: string, input: string): Out<SwapSession> {
  const r = verifyReservation(state, stationId, input);
  const existing = state.swaps.find((s) => s.reservationId === r.id && s.status === 'IN_PROGRESS');
  if (existing) return { state, result: existing };
  const session: SwapSession = {
    id: uniqueId('SWP', state.swaps.map((s) => s.id)),
    reservationId: r.id,
    stationId,
    assignedBatteryId: r.batteryId,
    startedAt: new Date().toISOString(),
    status: 'IN_PROGRESS',
  };
  return { state: { ...state, swaps: [session, ...state.swaps] }, result: session };
}

export function abortSwap(state: AppState, sessionId: string): Out<SwapSession> {
  const s = state.swaps.find((x) => x.id === sessionId);
  assert(s && s.status === 'IN_PROGRESS', 'No in-progress swap to abort.');
  const aborted: SwapSession = { ...s, status: 'ABORTED', completedAt: new Date().toISOString() };
  return { state: { ...state, swaps: state.swaps.map((x) => (x.id === s.id ? aborted : x)) }, result: aborted };
}

export interface CompleteSwapInput {
  stationId: string;
  reservationId: string;
  returnedBatteryId: string;
  returnedCharge: number;
}

export const receiptNumber = (swapId: string) => `RCT-${swapId.replace(/^SWP-/, '')}`;

/**
 * The operator records a swap that physically happened (the app does not move any hardware).
 * Rules 6, 7, 8 and 10 are enforced here, in one atomic state update:
 *   issued battery: RESERVED → IN_USE; returned battery: IN_USE → DEPLETED (state chart "Battery returned");
 *   reservation → COMPLETED; session → COMPLETED; receipt generated and the owner notified.
 */
export function completeSwap(state: AppState, input: CompleteSwapInput): Out<SwapSession> {
  const r = verifyReservation(state, input.stationId, input.reservationId); // rejects COMPLETED → rule 6
  const session = state.swaps.find((s) => s.reservationId === r.id && s.status === 'IN_PROGRESS');
  assert(session, 'Start the swap (verify the reservation) before completing it.');

  const vehicle = state.vehicles.find((v) => v.id === r.vehicleId)!;
  const returnedId = input.returnedBatteryId.trim().toUpperCase();
  assert(returnedId, 'Record the discharged battery returned by the customer.');
  const returned = state.batteries.find((b) => b.id.toUpperCase() === returnedId);
  assert(returned, `Returned battery ${returnedId} does not exist in the system.`);
  assert(returned.id !== r.batteryId, 'The returned battery cannot be the same as the battery being issued.');
  assert(returned.status === 'IN_USE', `Battery ${returned.id} is ${returned.status}, not IN_USE — it cannot be a customer-returned battery.`);
  assert(returned.batteryType === vehicle.batteryType, `Returned battery ${returned.id} (${returned.batteryType}) does not match the vehicle (${vehicle.batteryType}).`);
  assert(Number.isFinite(input.returnedCharge) && input.returnedCharge >= 0 && input.returnedCharge <= 100,
    'Returned battery charge must be between 0 and 100%.');

  const completed: SwapSession = { ...session, returnedBatteryId: returned.id, completedAt: new Date().toISOString(), status: 'COMPLETED' };

  // Cash is settled at the station when the swap is completed.
  let payments: Payment[] = state.payments;
  let paymentStatus = r.paymentStatus;
  if (r.paymentStatus === 'PAY_AT_STATION') {
    payments = payments.map((p) => (p.reservationId === r.id && p.status === 'PENDING' ? { ...p, status: 'SUCCESS' as const } : p));
    paymentStatus = 'PAID';
  }

  const next: AppState = {
    ...state,
    payments,
    swaps: state.swaps.map((s) => (s.id === session.id ? completed : s)),
    reservations: state.reservations.map((x) => (x.id === r.id ? { ...x, status: 'COMPLETED', paymentStatus } : x)),
    vehicles: state.vehicles.map((v) => (v.id === vehicle.id ? { ...v, currentBatteryId: r.batteryId } : v)),
    batteries: state.batteries.map((b) => {
      if (b.id === r.batteryId) return { ...b, status: 'IN_USE' }; // rule 7
      if (b.id === returned.id) return { ...b, stationId: input.stationId, chargePercentage: input.returnedCharge, status: 'DEPLETED' }; // rule 8
      return b;
    }),
  };
  return {
    state: notify(next, r.ownerId, 'Swap completed',
      `Swap ${completed.id} done: you received ${r.batteryId} and returned ${returned.id}. Receipt ${receiptNumber(completed.id)}, amount ₹${r.estimatedFee}.`,
      { reservationId: r.id, email: true, sms: true }),
    result: completed,
  };
}
