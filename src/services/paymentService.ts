import type { AppState, Out, Payment, PaymentMethod } from '../types';
import { assert } from './errors';
import { uniqueId } from '../utils/format';

// ALL PAYMENTS ARE SIMULATED. No real payment provider, card data or money is involved.

export interface PayInput {
  reservationId: string;
  method: PaymentMethod;
  /** The demo gateway outcome chosen by the user (digital methods only). */
  outcome: 'SUCCESS' | 'FAILURE';
}

export function validateUpi(upi: string): string | null {
  return /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/.test(upi.trim()) ? null : 'Enter a valid UPI ID, e.g. name@bank';
}

export function validateCard(number: string, expiry: string, cvv: string): string | null {
  const digits = number.replace(/\s/g, '');
  if (!/^\d{16}$/.test(digits)) return 'Card number must be 16 digits.';
  const m = /^(\d{2})\/(\d{2})$/.exec(expiry.trim());
  if (!m || +m[1] < 1 || +m[1] > 12) return 'Expiry must be in MM/YY format.';
  const expEnd = new Date(2000 + +m[2], +m[1], 1).getTime();
  if (expEnd < Date.now()) return 'This card has expired.';
  if (!/^\d{3}$/.test(cvv)) return 'CVV must be 3 digits.';
  return null;
}

/**
 * Records a simulated payment attempt.
 * Rule 9: reservation.paymentStatus always mirrors the attempt result.
 * Duplicate-charge protection: a reservation that is already paid / pay-at-station (or no longer
 * awaiting payment) rejects further attempts, so double clicks or retries can never charge twice.
 */
export function attemptPayment(state: AppState, input: PayInput): Out<Payment> {
  const r = state.reservations.find((x) => x.id === input.reservationId);
  assert(r, 'Reservation not found.');
  assert(r.status === 'PENDING_PAYMENT', r.status === 'CONFIRMED'
    ? 'This reservation is already confirmed — no further payment is needed.'
    : `A ${r.status.toLowerCase()} reservation cannot be paid.`);
  assert(!state.payments.some((p) => p.reservationId === r.id && (p.status === 'SUCCESS' || p.status === 'PENDING')),
    'A payment for this reservation already exists. Duplicate charge prevented.');

  const base = {
    id: uniqueId('PAY', state.payments.map((p) => p.id), false),
    reservationId: r.id,
    amount: r.estimatedFee,
    method: input.method,
    createdAt: new Date().toISOString(),
  };
  const ref = `SIM-${input.method}-${uniqueId('', [], false).slice(1)}`;

  let payment: Payment;
  let resUpdate: Pick<typeof r, 'status' | 'paymentStatus'>;
  if (input.method === 'CASH') {
    // Cash is collected by the operator at the station; reservation is confirmed with payment due.
    payment = { ...base, status: 'PENDING', transactionReference: ref };
    resUpdate = { status: 'CONFIRMED', paymentStatus: 'PAY_AT_STATION' };
  } else if (input.outcome === 'SUCCESS') {
    payment = { ...base, status: 'SUCCESS', transactionReference: ref };
    resUpdate = { status: 'CONFIRMED', paymentStatus: 'PAID' };
  } else {
    // A failed payment is stored as FAILED, never as success; the reservation keeps holding the battery
    // so the user can retry or cancel.
    payment = { ...base, status: 'FAILED', transactionReference: ref };
    resUpdate = { status: 'PENDING_PAYMENT', paymentStatus: 'FAILED' };
  }
  return {
    state: {
      ...state,
      payments: [payment, ...state.payments],
      reservations: state.reservations.map((x) => (x.id === r.id ? { ...x, ...resUpdate } : x)),
    },
    result: payment,
  };
}
