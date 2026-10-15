import type { AppState, Battery, BatteryType, Station } from '../types';
import { reservableBatteries } from './batteryService';

/** Search Station Service: filtering plus "nearest first" ordering (distance is demo data). */
export interface StationQuery {
  q?: string;
  batteryType?: string;
  status?: string;
  onlyWithCharged?: boolean;
}

export function searchStations(state: AppState, query: StationQuery): Station[] {
  const q = query.q?.trim().toLowerCase();
  return state.stations
    .filter((s) => (q ? `${s.name} ${s.address}`.toLowerCase().includes(q) : true))
    .filter((s) => (query.batteryType ? s.supportedBatteryTypes.some((t) => t === query.batteryType) : true))
    .filter((s) => (query.status ? s.status === query.status : true))
    .filter((s) => (query.onlyWithCharged ? reservableBatteries(state, s.id).length > 0 : true))
    .sort((a, b) => a.demoDistanceKm - b.demoDistanceKm);
}

/** Nearest OPEN station that has at least one reservable battery of this type. */
export function nearestStationWithBattery(state: AppState, batteryType: BatteryType): Station | undefined {
  return searchStations(state, { status: 'OPEN' }).find((s) => reservableBatteries(state, s.id, batteryType).length > 0);
}

/** checkAvailability(): charged, compatible, unreserved batteries at a station. */
export function checkAvailability(state: AppState, stationId: string, batteryType?: BatteryType): { count: number; batteries: Battery[] } {
  const batteries = reservableBatteries(state, stationId, batteryType);
  return { count: batteries.length, batteries };
}
