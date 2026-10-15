import type { AppState } from '../types';
import { createSeed } from '../data/seed';

const STATE_KEY = 'voltswap.state.v1';
const SESSION_KEY = 'voltswap.session.v1';

const ARRAY_KEYS: (keyof AppState)[] = ['users', 'vehicles', 'stations', 'batteries', 'reservations', 'swaps', 'payments'];

/** Loads persisted state; any malformed / missing data silently falls back to fresh seed data. */
export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return createSeed();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !ARRAY_KEYS.every((k) => Array.isArray(parsed[k]))) return createSeed();
    if (parsed.users.length === 0 || parsed.stations.length === 0) return createSeed();
    return parsed as AppState;
  } catch {
    return createSeed();
  }
}

export function saveState(state: AppState) {
  try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch { /* storage full/blocked: keep in-memory only */ }
}

export function loadSessionUserId(): string | null {
  try { return localStorage.getItem(SESSION_KEY); } catch { return null; }
}

export function saveSessionUserId(id: string | null) {
  try { id ? localStorage.setItem(SESSION_KEY, id) : localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}

export function clearAll() {
  try { localStorage.removeItem(STATE_KEY); } catch { /* ignore */ }
}
