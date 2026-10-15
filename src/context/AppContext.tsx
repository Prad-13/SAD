import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AppState, Out, User } from '../types';
import { clearAll, loadSessionUserId, loadState, saveSessionUserId, saveState } from '../services/storage';
import { createSeed } from '../data/seed';

export interface Toast { id: number; kind: 'success' | 'error' | 'info'; message: string }

interface AppContextValue {
  state: AppState;
  user: User | null;
  login: (userId: string) => void;
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
  const [state, setState] = useState<AppState>(loadState);
  const stateRef = useRef(state); // always the latest committed state, even between renders
  const [userId, setUserId] = useState<string | null>(loadSessionUserId);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => { stateRef.current = state; saveState(state); }, [state]);

  const user = useMemo(() => state.users.find((u) => u.id === userId) ?? null, [state.users, userId]);

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const notify = useCallback((kind: Toast['kind'], message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, kind, message }]);
    setTimeout(() => dismissToast(id), kind === 'error' ? 6000 : 4000);
  }, [dismissToast]);

  const run = useCallback<AppContextValue['run']>((fn, success) => {
    try {
      const out = fn(stateRef.current);
      stateRef.current = out.state;
      setState(out.state);
      if (success) notify('success', typeof success === 'function' ? success(out.result) : success);
      return out.result;
    } catch (e) {
      notify('error', e instanceof Error ? e.message : 'Something went wrong.');
      return undefined;
    }
  }, [notify]);

  const login = useCallback((id: string) => { saveSessionUserId(id); setUserId(id); }, []);
  const logout = useCallback(() => { saveSessionUserId(null); setUserId(null); }, []);
  const resetDemo = useCallback(() => {
    clearAll();
    const fresh = createSeed();
    stateRef.current = fresh;
    setState(fresh);
    notify('success', 'Demo data has been reset to the original sample data.');
  }, [notify]);

  const value = useMemo(
    () => ({ state, user, login, logout, run, toasts, notify, dismissToast, resetDemo }),
    [state, user, login, logout, run, toasts, notify, dismissToast, resetDemo],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside AppProvider');
  return v;
}
