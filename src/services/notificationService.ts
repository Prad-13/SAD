import type { AppState, Notification, NotificationChannel, Out } from '../types';
import { uniqueId } from '../utils/format';

/**
 * Notification service + (simulated) Email/SMS service.
 * Every event always creates an IN_APP notification; `email` and `sms` add simulated deliveries.
 * Nothing is actually sent: the rows are the "outbox" you can inspect in the app.
 */
export interface NotifyOptions {
  reservationId?: string;
  email?: boolean;
  sms?: boolean;
}

export function notify(state: AppState, userId: string, subject: string, message: string, opts: NotifyOptions = {}): AppState {
  const user = state.users.find((u) => u.id === userId);
  if (!user) return state;
  const channels: [NotificationChannel, string][] = [['IN_APP', user.email]];
  if (opts.email) channels.push(['EMAIL', user.email]);
  if (opts.sms) channels.push(['SMS', user.phone]);

  const ids = state.notifications.map((n) => n.id);
  const created: Notification[] = channels.map(([channel, recipient]) => {
    const id = uniqueId('NTF', ids, false);
    ids.push(id);
    return {
      id, userId, channel, recipient, subject, message, createdAt: new Date().toISOString(), read: false,
      reservationId: opts.reservationId,
    };
  });
  return { ...state, notifications: [...created, ...state.notifications] };
}

export function markAllRead(state: AppState, userId: string): Out<number> {
  let n = 0;
  const notifications = state.notifications.map((x) => {
    if (x.userId === userId && x.channel === 'IN_APP' && !x.read) { n++; return { ...x, read: true }; }
    return x;
  });
  return { state: { ...state, notifications }, result: n };
}

export const unreadCount = (state: AppState, userId: string) =>
  state.notifications.filter((n) => n.userId === userId && n.channel === 'IN_APP' && !n.read).length;
