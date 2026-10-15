import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AppState, Out, User } from '../types';
import { clearAll, loadSessionUserId, loadState, saveSessionUserId, saveState } from '../services/storage';
import { createSeed } from '../data/seed';
import { login as authLogin, register as authRegister, type RegisterInput } from '../services/authService';
import { expireStale } from '../services/reservationService';

export interface Toast { id: number; kind: 'success' | 'error' | 'info'; message: string }

interface AppContextValue {
  state: AppState;
  user: User | null;
  /** AuthService.login: validates credentials; returns the user or shows an error toast. */
  signIn: (email: string, password: string) => User | undefined;
  /** One-click demo login (no password prompt). */
  demoLogin: (userId: string) => void;
  /** Creates an owner account + vehicle and signs in. */
  signUp: (input: RegisterInput) => User | undefined;
  logout: () => void;
  /**
   * Runs a service function against the latest state. On success the new state is committed and
   * persisted; on a business-rule violation the state is untouched and an error toast is shown.
   * Returns the service result, or undefined if the action failed.
   */
  run: <T>(fn: (s: AppState) => Out<T>, success?: string | ((r: T) => string)) => T | undefined;
  toasts: Toast[];
  notify: (kind: Toast['kind'], message: string) => void;
  dismissToast: (id: number) => void;
  resetDemo: () => void;
}

const Ctx = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  // Reservations whose deadline passed while the app was closed expire immediately on load.
  const [state, setState] = useState<AppState>(() => expireStale(loadState()).state);
  const stateRef = useRef(state); // always the latest committed state, even between renders
  const [userId, setUserId] = useState<string | null>(loadSessionUserId);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => { stateRef.current = state; saveState(state); }, [state]);

  const user = useMemo(() => {
    const u = state.users.find((x) => x.id === userId);
    return u && u.active ? u : null;
  }, [state.users, userId]);

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const notify = useCallback((kind: Toast['kind'], message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, kind, message }]);
    setTimeout(() => dismissToast(id), kind === 'error' ? 6000 : 4000);
  }, [dismissToast]);

  const commit = useCallback((next: AppState) => { stateRef.current = next; setState(next); }, []);

  // Periodically expire stale reservations (unpaid after 15 min / slot + 60 min).
  useEffect(() => {
    const tick = () => {
      const out = expireStale(stateRef.current);
      if (out.result > 0) { commit(out.state); notify('info', `${out.result} reservation(s) expired and their batteries were released.`); }
    };
    const t = setInterval(tick, 30000);
    return () => clearInterval(t);
  }, [commit, notify]);

  const run = useCallback<AppContextValue['run']>((fn, success) => {
    try {
      const fresh = expireStale(stateRef.current).state; // actions always see up-to-date expiry
      const out = fn(fresh);
      commit(out.state);
      if (success) notify('success', typeof success === 'function' ? success(out.result) : success);
      return out.result;
    } catch (e) {
      notify('error', e instanceof Error ? e.message : 'Something went wrong.');
      return undefined;
    }
  }, [commit, notify]);

  const signIn = useCallback((email: string, password: string) => {
    try {
      const u = authLogin(stateRef.current, email, password);
      saveSessionUserId(u.id); setUserId(u.id);
      return u;
    } catch (e) {
      notify('error', e instanceof Error ? e.message : 'Login failed.');
      return undefined;
    }
  }, [notify]);

  const demoLogin = useCallback((id: string) => { saveSessionUserId(id); setUserId(id); }, []);

  const signUp = useCallback((input: RegisterInput) => {
    const u = run((s) => authRegister(s, input), 'Account created. Welcome to VoltSwap!');
    if (u) { saveSessionUserId(u.id); setUserId(u.id); }
    return u;
  }, [run]);

  const logout = useCallback(() => { saveSessionUserId(null); setUserId(null); }, []);
  const resetDemo = useCallback(() => {
    clearAll();
    commit(createSeed());
    notify('success', 'Demo data has been reset to the original sample data.');
  }, [commit, notify]);

  const value = useMemo(
    () => ({ state, user, signIn, demoLogin, signUp, logout, run, toasts, notify, dismissToast, resetDemo }),
    [state, user, signIn, demoLogin, signUp, logout, run, toasts, notify, dismissToast, resetDemo],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside AppProvider');
  return v;
}
