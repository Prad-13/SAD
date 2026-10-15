import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button, Card, DemoNote, EmptyState, PageHeader, StatusBadge } from '../../components/ui';
import { markAllRead, unreadCount } from '../../services/notificationService';
import { cn, formatDateTime } from '../../utils/format';

/** Messages produced by the Notification service. EMAIL and SMS rows are simulated deliveries. */
export default function Notifications() {
  const { state, user, run } = useApp();
  const mine = state.notifications.filter((n) => n.userId === user!.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unread = unreadCount(state, user!.id);
  return (
    <>
      <PageHeader title="Notifications" subtitle="In-app messages plus the simulated email and SMS we “sent” you."
        actions={<Button variant="secondary" disabled={unread === 0} onClick={() => run((s) => markAllRead(s, user!.id), 'All notifications marked as read.')}>Mark all as read</Button>} />
      <div className="mb-4"><DemoNote>Email and SMS are simulated by the in-app Email/SMS service — nothing leaves this browser.</DemoNote></div>
      <Card>
        {mine.length === 0 ? <EmptyState icon={Bell} title="No notifications yet" /> : (
          <ul className="divide-y divide-slate-100">
            {mine.map((n) => (
              <li key={n.id} className={cn('flex flex-col gap-1 p-4', n.channel === 'IN_APP' && !n.read && 'bg-emerald-50/60')}>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={n.channel} />
                  <span className="font-semibold">{n.subject}</span>
                  <span className="ml-auto text-xs text-slate-400">{formatDateTime(n.createdAt)}</span>
                </div>
                <p className="text-sm text-slate-600">{n.message}</p>
                <p className="text-xs text-slate-400">
                  {n.channel === 'IN_APP' ? 'In-app' : `To ${n.recipient} (simulated)`}
                  {n.reservationId && <> · <Link className="text-blue-600 hover:underline" to={`/owner/reservations/${n.reservationId}`}>{n.reservationId}</Link></>}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
