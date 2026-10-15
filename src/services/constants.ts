import type { BatteryStatus, Reservation } from '../types';

/** Business rule: a battery counts as "charged" only at or above this level. */
export const MIN_CHARGE_FOR_RESERVATION = 90;
/** Batteries under this health are never offered to customers. */
export const MIN_HEALTH_FOR_RESERVATION = 70;
export const GST_RATE = 0.05;

/**
 * Valid manual battery status transitions (operator / admin), taken from the state chart.
 * FULLY_CHARGED → RESERVED and RESERVED → FULLY_CHARGED/IN_USE happen only through the
 * reservation (reserve, cancel, expire) and swap workflows; IN_USE → DEPLETED happens when the
 * customer's battery is returned during a swap.
 */
export const BATTERY_TRANSITIONS: Record<BatteryStatus, BatteryStatus[]> = {
  CREATED: ['IN_INVENTORY'], // "Install at station"
  IN_INVENTORY: ['CHARGING'], // "Send to charging"
  CHARGING: ['FULLY_CHARGED'], // "Charging complete"
  DEPLETED: ['CHARGING'], // "Send to charging"
  FULLY_CHARGED: [],
  RESERVED: [],
  IN_USE: [],
};

export const PENDING_PAYMENT_TTL_MIN = 15;
export const CONFIRMED_GRACE_AFTER_SLOT_MIN = 60;
/** Reservations in these states hold a battery. */
export const ACTIVE_RESERVATION_STATUSES: Reservation['status'][] = ['PENDING_PAYMENT', 'CONFIRMED'];
export const isActiveReservation = (r: Reservation) => ACTIVE_RESERVATION_STATUSES.includes(r.status);

