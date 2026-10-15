import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ClipboardList, Hourglass, XCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button, Card, ConfirmDialog, EmptyState, PageHeader, StatusBadge, Table, Td } from '../../components/ui';
import PaymentModal, { Receipt } from '../../components/PaymentModal';
import QrCode from '../../components/QrCode';
import SwapReceipt from '../../components/SwapReceipt';
import { canCancel, cancelReservation } from '../../services/reservationService';
import { formatDateTime, formatINR } from '../../utils/format';

export default function ReservationDetail() {
  const { reservationId } = useParams();
  const [search, setSearch] = useSearchParams();
  const { state, user, run } = useApp();
  const [payOpen, setPayOpen] = useState(() => search.get('pay') === '1' && state.reservations.find((x) => x.id === reservationId)?.status === 'PENDING_PAYMENT');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const r = state.reservations.find((x) => x.id === reservationId && x.ownerId === user!.id);
  if (!r) return <Card><EmptyState icon={ClipboardList} title="Reservation not found" action={<Link to="/owner/reservations"><Button>My reservations</Button></Link>} /></Card>;

  const station = state.stations.find((s) => s.id === r.stationId);
  const vehicle = state.vehicles.find((v) => v.id === r.vehicleId);
  const battery = state.batteries.find((b) => b.id === r.batteryId);
  const payments = state.payments.filter((p) => p.reservationId === r.id);
  const goodPayment = payments.find((p) => p.status === 'SUCCESS' || p.status === 'PENDING' || p.status === 'REFUNDED');
  const swap = state.swaps.find((s) => s.reservationId === r.id && s.status === 'COMPLETED');

  const banner = {
    PENDING_PAYMENT: { icon: Hourglass, tone: 'border-amber-200 bg-amber-50 text-amber-800', text: r.paymentStatus === 'FAILED' ? 'Payment failed. Your battery is held — retry payment or cancel.' : 'Reservation created. Complete payment to confirm it.' },
    CONFIRMED: { icon: CheckCircle2, tone: 'border-emerald-200 bg-emerald-50 text-emerald-800', text: 'Reservation confirmed. Show this reservation ID to the station operator at your slot.' },
    COMPLETED: { icon: CheckCircle2, tone: 'border-emerald-200 bg-emerald-50 text-emerald-800', text: 'Swap completed.' },
    EXPIRED: { icon: XCircle, tone: 'border-slate-200 bg-slate-50 text-slate-700', text: 'This reservation expired and the battery was released.' },
    CANCELLED: { icon: XCircle, tone: 'border-slate-200 bg-slate-50 text-slate-700', text: 'This reservation was cancelled. The battery has been released.' },
  }[r.status];
  const Icon = banner.icon;

  return (
    <>
      <Link to="/owner/reservations" className="mb-3 inline-flex items-center gap-1 text-sm text-blue-600"><ArrowLeft className="h-4 w-4" />My reservations</Link>
      <PageHeader title={`Reservation ${r.id}`} subtitle="Keep this ID — the operator needs it to verify your swap." />
      <div className={`mb-5 flex items-center gap-2 rounded-lg border p-3 text-sm font-medium ${banner.tone}`}><Icon className="h-5 w-5" />{banner.text}</div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 font-semibold">Details</h2>
          <dl className="space-y-2 text-sm">
            {([
              ['Station', station?.name], ['Address', station?.address], ['Slot', formatDateTime(r.slot)],
              ['Vehicle', `${vehicle?.registrationNumber} (${vehicle?.batteryType})`],
              ['Battery', `${r.batteryId} · ${battery?.capacityKWh} kWh`], ['Fee (incl. GST)', formatINR(r.estimatedFee)],
              ['Created', formatDateTime(r.createdAt)],
            ] as [string, string | undefined][]).map(([k, v]) => <div key={k} className="flex justify-between gap-4"><dt className="text-slate-500">{k}</dt><dd className="text-right font-medium">{v}</dd></div>)}
            <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd><StatusBadge status={r.status} /></dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Payment</dt><dd><StatusBadge status={r.paymentStatus} /></dd></div>
          </dl>
          <div className="mt-5 flex flex-wrap gap-2">
            {r.status === 'PENDING_PAYMENT' && <Button onClick={() => setPayOpen(true)}>{r.paymentStatus === 'FAILED' ? 'Retry payment' : 'Pay now'}</Button>}
            {canCancel(state, r) && <Button variant="secondary" onClick={() => setConfirmCancel(true)}>Cancel reservation</Button>}
          </div>
          {swap && <p className="mt-4 text-sm text-emerald-700">Swap {swap.id} completed {formatDateTime(swap.completedAt)}. Returned battery: {swap.returnedBatteryId}.</p>}
        </Card>

        <div className="space-y-4">
          {r.status === 'CONFIRMED' && (
            <Card className="flex flex-col items-center gap-2 p-5 text-center">
              <h2 className="font-semibold">Your check-in QR code</h2>
              <QrCode value={r.qrCode} />
              <p className="break-all font-mono text-xs text-slate-500">{r.qrCode}</p>
              <p className="text-xs text-slate-500">Show this to the station operator. Valid until {formatDateTime(r.expiresAt)}.</p>
            </Card>
          )}
          {swap && <SwapReceipt state={state} swap={swap} />}
          {goodPayment && <Receipt payment={goodPayment} reservation={r} />}
          <Card>
            <div className="border-b border-slate-200 p-4"><h2 className="font-semibold">Payment attempts <span className="text-xs font-normal text-amber-600">(simulated)</span></h2></div>
            {payments.length === 0 ? <p className="p-4 text-sm text-slate-500">No payment attempts yet.</p> : (
              <Table headers={['Reference', 'Method', 'Amount', 'Status']}>
                {payments.map((p) => <tr key={p.id}><Td className="font-mono text-xs">{p.transactionReference}</Td><Td>{p.method}</Td><Td>{formatINR(p.amount)}</Td><Td><StatusBadge status={p.status} /></Td></tr>)}
              </Table>
            )}
          </Card>
        </div>
      </div>

      <PaymentModal reservation={r} open={payOpen} onClose={() => { setPayOpen(false); if (search.get('pay')) setSearch({}, { replace: true }); }} />
      <ConfirmDialog open={confirmCancel} danger title="Cancel this reservation?"
        message="The battery is released back to inventory and any simulated digital payment is refunded."
        confirmLabel="Cancel reservation" onCancel={() => setConfirmCancel(false)}
        onConfirm={() => { run((s) => cancelReservation(s, r.id), 'Reservation cancelled and battery released.'); setConfirmCancel(false); }} />
    </>
  );
}
