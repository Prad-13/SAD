import type { AppState, Reservation, SwapSession } from '../types';
import { isActiveReservation } from './constants';
import { isReservable } from './batteryService';

/** All dashboard numbers are derived from state on every render — nothing is hardcoded (rule 10). */
export function adminMetrics(s: AppState) {
  return {
    stations: s.stations.length,
    batteries: s.batteries.length,
    availableBatteries: s.batteries.filter((b) => isReservable(s, b)).length,
    activeReservations: s.reservations.filter(isActiveReservation).length,
    completedSwaps: s.swaps.filter((x) => x.status === 'COMPLETED').length,
    revenue: s.payments.filter((p) => p.status === 'SUCCESS').reduce((a, p) => a + p.amount, 0),
  };
}

export function swapsPerDay(swaps: SwapSession[], days = 7) {
  const out: { day: string; swaps: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    out.push({
      day: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      swaps: swaps.filter((x) => x.status === 'COMPLETED' && x.completedAt && new Date(x.completedAt) >= d && new Date(x.completedAt) < next).length,
    });
  }
  return out;
}

export const ownerReservations = (s: AppState, ownerId: string): Reservation[] =>
  s.reservations.filter((r) => r.ownerId === ownerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const stationAvailableCount = (s: AppState, stationId: string) =>
  s.batteries.filter((b) => b.stationId === stationId && isReservable(s, b)).length;
