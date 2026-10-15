import type { BatteryStatus, Reservation } from '../types';

/** Business rule: a battery counts as "charged" only at or above this level. */
export const MIN_CHARGE_FOR_RESERVATION = 90;
/** Batteries under this health are never offered to customers. */
export const MIN_HEALTH_FOR_RESERVATION = 70;
export const GST_RATE = 0.05;

/**
 * Valid manual battery status transitions (operator / admin).
 * RESERVED and IN_USE are deliberately absent as targets: they can only be
 * set by the reservation and swap workflows, never by hand.
 */
export const BATTERY_TRANSITIONS: Record<BatteryStatus, BatteryStatus[]> = {
  AVAILABLE: ['MAINTENANCE'],
  CHARGING: ['AVAILABLE', 'MAINTENANCE'],
  NEEDS_CHARGING: ['CHARGING', 'MAINTENANCE'],
  MAINTENANCE: ['CHARGING'],
  RESERVED: [],
  IN_USE: [],
};

/** Reservations in these states hold a battery. */
export const ACTIVE_RESERVATION_STATUSES: Reservation['status'][] = ['PENDING_PAYMENT', 'CONFIRMED'];
export const isActiveReservation = (r: Reservation) => ACTIVE_RESERVATION_STATUSES.includes(r.status);
