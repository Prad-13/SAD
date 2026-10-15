import { useMemo, useState } from 'react';
import { Download, FileX } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button, Card, EmptyState, PageHeader, StatusBadge, Table, Td, inputClass } from '../../components/ui';
import { cn, downloadCsv, formatDateTime, formatINR, humanize } from '../../utils/format';

type Tab = 'reservations' | 'swaps' | 'payments' | 'notifications';

export default function AdminReports() {
  const { state } = useApp();
  const [tab, setTab] = useState<Tab>('reservations');
  const [status, setStatus] = useState('');
  const [stationId, setStationId] = useState('');
  const stationName = (id: string) => state.stations.find((s) => s.id === id)?.name ?? id;
  const userName = (id: string) => state.users.find((u) => u.id === id)?.name ?? id;

  const reservations = useMemo(() => state.reservations.filter((r) => (!status || r.status === status) && (!stationId || r.stationId === stationId)), [state, status, stationId]);
  const swaps = useMemo(() => state.swaps.filter((s) => (!status || s.status === status) && (!stationId || s.stationId === stationId)), [state, status, stationId]);
  const payments = useMemo(() => state.payments.filter((p) => (!status || p.status === status) &&
    (!stationId || state.reservations.find((r) => r.id === p.reservationId)?.stationId === stationId)), [state, status, stationId]);

  const notifications = useMemo(() => state.notifications.filter((n) => !status || n.channel === status), [state, status]);

  const statuses = { reservations: ['PENDING_PAYMENT', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'EXPIRED'], swaps: ['IN_PROGRESS', 'COMPLETED', 'ABORTED'], payments: ['SUCCESS', 'FAILED', 'PENDING', 'REFUNDED', 'CANCELLED'], notifications: ['IN_APP', 'EMAIL', 'SMS'] }[tab];

  const exportCsv = () => {
    if (tab === 'reservations') downloadCsv('voltswap-reservations.csv', reservations.map((r) => ({ ReservationID: r.id, Owner: userName(r.ownerId), Station: stationName(r.stationId), Vehicle: r.vehicleId, Battery: r.batteryId, Slot: r.slot, Created: r.createdAt, Status: r.status, PaymentStatus: r.paymentStatus, FeeINR: r.estimatedFee })));
    if (tab === 'swaps') downloadCsv('voltswap-swaps.csv', swaps.map((s) => ({ SwapID: s.id, ReservationID: s.reservationId, Station: stationName(s.stationId), IssuedBattery: s.assignedBatteryId, ReturnedBattery: s.returnedBatteryId, Started: s.startedAt, Completed: s.completedAt, Status: s.status })));
    if (tab === 'notifications') downloadCsv('voltswap-notifications-simulated.csv', notifications.map((n) => ({ ID: n.id, Channel: n.channel, To: n.recipient, Subject: n.subject, Message: n.message, Created: n.createdAt })));
    if (tab === 'payments') downloadCsv('voltswap-payments-simulated.csv', payments.map((p) => ({ PaymentID: p.id, ReservationID: p.reservationId, Method: p.method, AmountINR: p.amount, Status: p.status, Reference: p.transactionReference, Created: p.createdAt })));
  };
  const count = { reservations: reservations.length, swaps: swaps.length, payments: payments.length, notifications: notifications.length }[tab];

  return (
    <>
      <PageHeader title="Reservations & Reports" subtitle="Filter records and export demo data as CSV."
        actions={<Button variant="secondary" disabled={count === 0} onClick={exportCsv}><Download className="h-4 w-4" />Export CSV</Button>} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg bg-slate-200 p-1">
          {(['reservations', 'swaps', 'payments', 'notifications'] as Tab[]).map((t) => (
            <button key={t} onClick={() => { setTab(t); setStatus(''); }} className={cn('rounded-md px-4 py-1.5 text-sm font-medium', tab === t ? 'bg-white shadow-sm' : 'text-slate-600')}>{humanize(t)}</button>
          ))}
        </div>
        <select aria-label="Status filter" className={inputClass + ' w-48'} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>{statuses.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
        </select>
        <select aria-label="Station filter" className={inputClass + ' w-56'} value={stationId} onChange={(e) => setStationId(e.target.value)}>
          <option value="">All stations</option>{state.stations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <span className="text-sm text-slate-500">{count} record(s)</span>
      </div>
      <Card>
        {count === 0 ? <EmptyState icon={FileX} title="No records match these filters" /> : tab === 'reservations' ? (
          <Table headers={['Reservation', 'Owner', 'Station', 'Battery', 'Slot', 'Fee', 'Status', 'Payment']}>
            {reservations.map((r) => <tr key={r.id}><Td className="font-mono text-xs font-semibold">{r.id}</Td><Td>{userName(r.ownerId)}</Td><Td>{stationName(r.stationId)}</Td><Td>{r.batteryId}</Td><Td>{formatDateTime(r.slot)}</Td><Td>{formatINR(r.estimatedFee)}</Td><Td><StatusBadge status={r.status} /></Td><Td><StatusBadge status={r.paymentStatus} /></Td></tr>)}
          </Table>
        ) : tab === 'swaps' ? (
          <Table headers={['Swap', 'Reservation', 'Station', 'Issued', 'Returned', 'Started', 'Completed', 'Status']}>
            {swaps.map((s) => <tr key={s.id}><Td className="font-mono text-xs">{s.id}</Td><Td className="font-mono text-xs">{s.reservationId}</Td><Td>{stationName(s.stationId)}</Td><Td>{s.assignedBatteryId}</Td><Td>{s.returnedBatteryId ?? '—'}</Td><Td>{formatDateTime(s.startedAt)}</Td><Td>{formatDateTime(s.completedAt)}</Td><Td><StatusBadge status={s.status} /></Td></tr>)}
          </Table>
        ) : tab === 'notifications' ? (
          <Table headers={['Channel', 'To (simulated)', 'Subject', 'Message', 'Sent']}>
            {notifications.map((n) => <tr key={n.id}><Td><StatusBadge status={n.channel} /></Td><Td>{n.recipient}</Td><Td>{n.subject}</Td><Td className="max-w-md truncate">{n.message}</Td><Td>{formatDateTime(n.createdAt)}</Td></tr>)}
          </Table>
        ) : (
          <Table headers={['Payment', 'Reservation', 'Method', 'Amount', 'Reference (simulated)', 'Date', 'Status']}>
            {payments.map((p) => <tr key={p.id}><Td className="font-mono text-xs">{p.id}</Td><Td className="font-mono text-xs">{p.reservationId}</Td><Td>{p.method}</Td><Td>{formatINR(p.amount)}</Td><Td className="font-mono text-xs">{p.transactionReference}</Td><Td>{formatDateTime(p.createdAt)}</Td><Td><StatusBadge status={p.status} /></Td></tr>)}
          </Table>
        )}
      </Card>
    </>
  );
}
