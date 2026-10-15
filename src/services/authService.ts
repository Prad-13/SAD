import type { AppState, BatteryType, Out, Role, User, Vehicle } from '../types';
import { BATTERY_TYPES } from '../types';
import { assert } from './errors';
import { uniqueId } from '../utils/format';

/**
 * Authentication service (AuthService in the diagrams).
 * DEMO ONLY: the "hash" below is a tiny non-cryptographic checksum so passwords are not stored as
 * plain text in LocalStorage. A real system would hash on a server with bcrypt/argon2.
 */
export function hashPassword(email: string, password: string): string {
  let h = 5381;
  for (const ch of `${email.trim().toLowerCase()}:${password}`) h = ((h << 5) + h + ch.charCodeAt(0)) >>> 0;
  return `demo$${h.toString(16)}`;
}

export const DEMO_PASSWORD = 'demo123';

/** login(): returns the user if credentials are valid and the account is active. */
export function login(state: AppState, email: string, password: string): User {
  const user = state.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  assert(user && user.passwordHash === hashPassword(user.email, password), 'Invalid email or password.');
  assert(user.active, 'This account has been deactivated. Contact an administrator.');
  return user;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[6-9]\d{9}$/;
const REG_RE = /^[A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{4}$/i;

export interface RegisterInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  registrationNumber: string;
  vehicleModel: string;
  batteryType: BatteryType;
}

export function validateRegistration(state: AppState, i: RegisterInput): Record<string, string> {
  const e: Record<string, string> = {};
  if (i.name.trim().length < 2) e.name = 'Enter your full name.';
  if (!EMAIL_RE.test(i.email.trim())) e.email = 'Enter a valid email address.';
  else if (state.users.some((u) => u.email.toLowerCase() === i.email.trim().toLowerCase())) e.email = 'An account with this email already exists.';
  if (!PHONE_RE.test(i.phone.trim())) e.phone = 'Enter a 10-digit Indian mobile number.';
  if (i.password.length < 6) e.password = 'Password must be at least 6 characters.';
  if (!REG_RE.test(i.registrationNumber.trim())) e.registrationNumber = 'Use a format like TS09 EV 1234.';
  else if (state.vehicles.some((v) => v.registrationNumber.replace(/\s/g, '').toUpperCase() === i.registrationNumber.replace(/\s/g, '').toUpperCase()))
    e.registrationNumber = 'This vehicle is already registered.';
  if (i.vehicleModel.trim().length < 2) e.vehicleModel = 'Enter the vehicle model.';
  if (!BATTERY_TYPES.includes(i.batteryType)) e.batteryType = 'Select a battery type.';
  return e;
}

/** Register: creates an EV Owner account together with their first vehicle. */
export function register(state: AppState, input: RegisterInput): Out<User> {
  const errors = validateRegistration(state, input);
  assert(Object.keys(errors).length === 0, Object.values(errors)[0]);
  const user: User = {
    id: uniqueId('USR', state.users.map((u) => u.id), false),
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    passwordHash: hashPassword(input.email, input.password),
    role: 'OWNER',
    active: true,
  };
  const vehicle: Vehicle = {
    id: uniqueId('VEH', state.vehicles.map((v) => v.id), false),
    ownerId: user.id,
    registrationNumber: input.registrationNumber.trim().toUpperCase(),
    batteryType: input.batteryType,
    model: input.vehicleModel.trim(),
  };
  return { state: { ...state, users: [...state.users, user], vehicles: [...state.vehicles, vehicle] }, result: user };
}

export interface UserInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: Role;
  stationId?: string;
}

/** Admin: create an operator or administrator account (owners self-register). */
export function createStaffUser(state: AppState, input: UserInput): Out<User> {
  const e: Record<string, string> = {};
  if (input.name.trim().length < 2) e.name = 'Enter a name.';
  if (!EMAIL_RE.test(input.email.trim())) e.email = 'Enter a valid email address.';
  else if (state.users.some((u) => u.email.toLowerCase() === input.email.trim().toLowerCase())) e.email = 'An account with this email already exists.';
  if (!PHONE_RE.test(input.phone.trim())) e.phone = 'Enter a 10-digit Indian mobile number.';
  if (input.password.length < 6) e.password = 'Password must be at least 6 characters.';
  if (input.role === 'OPERATOR' && !state.stations.some((s) => s.id === input.stationId)) e.stationId = 'Assign the operator to a station.';
  assert(Object.keys(e).length === 0, Object.values(e)[0]);
  const user: User = {
    id: uniqueId('USR', state.users.map((u) => u.id), false),
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    passwordHash: hashPassword(input.email, input.password),
    role: input.role,
    active: true,
    ...(input.role === 'OPERATOR' ? { stationId: input.stationId } : {}),
  };
  return { state: { ...state, users: [...state.users, user] }, result: user };
}

export function setUserActive(state: AppState, userId: string, active: boolean, actingUserId: string): Out<User> {
  const u = state.users.find((x) => x.id === userId);
  assert(u, 'User not found.');
  assert(u.id !== actingUserId, 'You cannot deactivate your own account.');
  const updated = { ...u, active };
  return { state: { ...state, users: state.users.map((x) => (x.id === u.id ? updated : x)) }, result: updated };
}
