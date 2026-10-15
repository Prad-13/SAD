// Central, typed data model for VoltSwap. Every entity in the prototype is defined here.

export type Role = 'OWNER' | 'OPERATOR' | 'ADMIN';

export const BATTERY_TYPES = ['VS-48V', 'VS-60V', 'VS-72V'] as const;
export type BatteryType = (typeof BATTERY_TYPES)[number];

export type BatteryStatus =
  | 'CHARGING'
  | 'AVAILABLE'
  | 'RESERVED'
  | 'IN_USE'
  | 'NEEDS_CHARGING'
  | 'MAINTENANCE';

export const BATTERY_STATUSES: BatteryStatus[] = [
  'AVAILABLE',
  'CHARGING',
  'RESERVED',
  'IN_USE',
  'NEEDS_CHARGING',
  'MAINTENANCE',
];

export type StationStatus = 'OPEN' | 'CLOSED' | 'MAINTENANCE';

export type ReservationStatus = 'PENDING_PAYMENT' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
export type ReservationPaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'PAY_AT_STATION' | 'REFUNDED';

export type PaymentMethod = 'UPI' | 'CARD' | 'CASH';
export type PaymentStatus = 'SUCCESS' | 'FAILED' | 'PENDING' | 'REFUNDED' | 'CANCELLED';

export type SwapStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ABORTED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** Only for operators: the station they run. */
  stationId?: string;
}

export interface Vehicle {
  id: string;
  ownerId: string;
  registrationNumber: string;
  batteryType: BatteryType;
  model: string;
  /** Battery currently installed in the vehicle (IN_USE). */
  currentBatteryId?: string;
}

export interface Station {
  id: string;
  name: string;
  address: string;
  supportedBatteryTypes: BatteryType[];
  status: StationStatus;
  pricePerSwap: number; // INR, before GST
  slotCapacity: number; // max reservations per time slot
  demoDistanceKm: number; // demo data, not real GPS
}

export interface Battery {
  id: string;
  stationId: string;
  batteryType: BatteryType;
  capacityKWh: number;
  chargePercentage: number;
  healthPercentage: number;
  status: BatteryStatus;
}

export interface Reservation {
  id: string;
  ownerId: string;
  stationId: string;
  vehicleId: string;
  batteryId: string;
  slot: string; // ISO date-time of slot start
  createdAt: string;
  status: ReservationStatus;
  paymentStatus: ReservationPaymentStatus;
  estimatedFee: number; // INR incl. GST
}

export interface SwapSession {
  id: string;
  reservationId: string;
  stationId: string;
  returnedBatteryId?: string;
  assignedBatteryId: string;
  startedAt: string;
  completedAt?: string;
  status: SwapStatus;
}

export interface Payment {
  id: string;
  reservationId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionReference: string;
  createdAt: string;
}

export interface AppState {
  users: User[];
  vehicles: Vehicle[];
  stations: Station[];
  batteries: Battery[];
  reservations: Reservation[];
  swaps: SwapSession[];
  payments: Payment[];
}

/** Every service function returns the next state plus a result value. */
export interface Out<T> {
  state: AppState;
  result: T;
}
