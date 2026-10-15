import type { AppState, Battery, BatteryStatus, BatteryType, Out, Station } from '../types';
import { BATTERY_TYPES } from '../types';
import { assert } from './errors';
import {
  BATTERY_TRANSITIONS,
  MIN_CHARGE_FOR_RESERVATION,
  MIN_HEALTH_FOR_RESERVATION,
  isActiveReservation,
} from './constants';

// Battery Service (inventory + lifecycle) and station management.

/** Business rule 1: only a compatible, charged (FULLY_CHARGED), healthy, not-already-reserved battery can be booked. */
export function isReservable(state: AppState, battery: Battery): boolean {
  return (
    battery.status === 'FULLY_CHARGED' &&
    battery.chargePercentage >= MIN_CHARGE_FOR_RESERVATION &&
    battery.healthPercentage >= MIN_HEALTH_FOR_RESERVATION &&
    !state.reservations.some((r) => isActiveReservation(r) && r.batteryId === battery.id)
  );
}

export function reservableBatteries(state: AppState, stationId: string, batteryType?: BatteryType): Battery[] {
  return state.batteries.filter(
    (b) => b.stationId === stationId && (!batteryType || b.batteryType === batteryType) && isReservable(state, b),
  );
}

export function countByStatus(state: AppState, stationId?: string): Record<BatteryStatus, number> {
  const counts: Record<BatteryStatus, number> = {
    CREATED: 0, IN_INVENTORY: 0, CHARGING: 0, FULLY_CHARGED: 0, RESERVED: 0, IN_USE: 0, DEPLETED: 0,
  };
  state.batteries.forEach((b) => {
    if (!stationId || b.stationId === stationId) counts[b.status]++;
  });
  return counts;
}

export const canTransition = (from: BatteryStatus, to: BatteryStatus) => BATTERY_TRANSITIONS[from].includes(to);

/** updateBatteryStatus(): operator/admin change, restricted to the transition table in constants.ts. */
export function transitionBattery(state: AppState, batteryId: string, to: BatteryStatus): Out<Battery> {
  const battery = state.batteries.find((b) => b.id === batteryId);
  assert(battery, 'Battery not found.');
  assert(
    canTransition(battery.status, to),
    `Invalid transition: ${battery.status} → ${to}. ${
      battery.status === 'RESERVED' || battery.status === 'IN_USE' || battery.status === 'FULLY_CHARGED'
        ? 'This status is managed by the reservation/swap workflow.'
        : ''
    }`.trim(),
  );
  // "Charging complete" is recorded by the operator; the battery is then full.
  const updated: Battery = {
    ...battery,
    status: to,
    chargePercentage: to === 'FULLY_CHARGED' ? 100 : battery.chargePercentage,
  };
  return { state: { ...state, batteries: state.batteries.map((b) => (b.id === batteryId ? updated : b)) }, result: updated };
}

export type BatteryInput = Battery;

export function validateBatteryInput(state: AppState, input: BatteryInput, editing: boolean): Record<string, string> {
  const e: Record<string, string> = {};
  const id = input.id.trim();
  if (!id) e.id = 'Battery ID is required.';
  else if (!/^[A-Za-z0-9-]{3,20}$/.test(id)) e.id = 'Use 3–20 letters, digits or hyphens.';
  else if (!editing && state.batteries.some((b) => b.id.toLowerCase() === id.toLowerCase()))
    e.id = 'A battery with this ID already exists.';
  if (!BATTERY_TYPES.includes(input.batteryType)) e.batteryType = 'Select a battery type.';
  if (!state.stations.some((s) => s.id === input.stationId)) e.stationId = 'Select a station.';
  if (!(input.capacityKWh > 0 && input.capacityKWh <= 20)) e.capacityKWh = 'Capacity must be between 0 and 20 kWh.';
  if (!(Number.isFinite(input.chargePercentage) && input.chargePercentage >= 0 && input.chargePercentage <= 100))
    e.chargePercentage = 'Charge must be 0–100%.';
  if (!(Number.isFinite(input.healthPercentage) && input.healthPercentage >= 0 && input.healthPercentage <= 100))
    e.healthPercentage = 'Health must be 0–100%.';
  if (input.status === 'FULLY_CHARGED' && input.chargePercentage < MIN_CHARGE_FOR_RESERVATION)
    e.status = `FULLY_CHARGED batteries need at least ${MIN_CHARGE_FOR_RESERVATION}% charge.`;
  return e;
}

export function addBattery(state: AppState, input: BatteryInput): Out<Battery> {
  const errors = validateBatteryInput(state, input, false);
  assert(Object.keys(errors).length === 0, Object.values(errors)[0]);
  assert(input.status !== 'RESERVED', 'A new battery cannot start as RESERVED.');
  const battery = { ...input, id: input.id.trim() };
  return { state: { ...state, batteries: [...state.batteries, battery] }, result: battery };
}

export function updateBattery(state: AppState, input: BatteryInput): Out<Battery> {
  const existing = state.batteries.find((b) => b.id === input.id);
  assert(existing, 'Battery not found.');
  const errors = validateBatteryInput(state, input, true);
  assert(Object.keys(errors).length === 0, Object.values(errors)[0]);
  const locked = existing.status === 'RESERVED' || existing.status === 'IN_USE';
  if (locked) {
    assert(
      input.status === existing.status && input.stationId === existing.stationId && input.batteryType === existing.batteryType,
      `A ${existing.status} battery's status, type and station cannot be changed until its reservation/swap is finished.`,
    );
  } else if (input.status !== existing.status) {
    assert(canTransition(existing.status, input.status), `Invalid transition: ${existing.status} → ${input.status}.`);
  }
  return { state: { ...state, batteries: state.batteries.map((b) => (b.id === input.id ? input : b)) }, result: input };
}

// ---------- Stations ----------

export function validateStationInput(station: Station): Record<string, string> {
  const e: Record<string, string> = {};
  if (station.name.trim().length < 3) e.name = 'Name must be at least 3 characters.';
  if (station.address.trim().length < 5) e.address = 'Address must be at least 5 characters.';
  if (station.supportedBatteryTypes.length === 0) e.supportedBatteryTypes = 'Select at least one battery type.';
  if (!(station.pricePerSwap > 0 && station.pricePerSwap <= 5000)) e.pricePerSwap = 'Price must be between ₹1 and ₹5000.';
  if (!(Number.isInteger(station.slotCapacity) && station.slotCapacity >= 1 && station.slotCapacity <= 20))
    e.slotCapacity = 'Slot capacity must be a whole number from 1 to 20.';
  if (!(station.demoDistanceKm >= 0 && station.demoDistanceKm <= 500)) e.demoDistanceKm = 'Distance must be 0–500 km.';
  return e;
}

export function saveStation(state: AppState, station: Station, isNew: boolean): Out<Station> {
  const errors = validateStationInput(station);
  assert(Object.keys(errors).length === 0, Object.values(errors)[0]);
  if (isNew) {
    const n = state.stations.length + 1001;
    let id = `STN-${n}`;
    let k = n;
    while (state.stations.some((s) => s.id === id)) id = `STN-${++k}`;
    const created = { ...station, id };
    return { state: { ...state, stations: [...state.stations, created] }, result: created };
  }
  assert(state.stations.some((s) => s.id === station.id), 'Station not found.');
  return { state: { ...state, stations: state.stations.map((s) => (s.id === station.id ? station : s)) }, result: station };
}
