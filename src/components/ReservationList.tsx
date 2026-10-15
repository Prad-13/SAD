import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Reservation } from '../types';
import { useApp } from '../context/AppContext';
import { canCancel, cancelReservation } from '../services/reservationService';
import { Button, ConfirmDialog, StatusBadge, Table, Td } from './ui';
import PaymentModal from './PaymentModal';
import { formatDateTime, formatINR } from '../utils/format';

/** Owner-facing reservation table with pay / cancel actions. */
export default function ReservationList({ reservations }: { reservations: Reservation[] }) {
  const { state, run } = useApp();
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [payFor, setPayFor] = useState<Reservation | null>(null);
  // Always read the live reservation so the modal reflects updated payment state.
  const livePay = payFor ? state.reservations.find((r) => r.id === payFor.id) ?? payFor : null;

  return (
    <>
      <Table headers={['Reservation', 'Station', 'Slot', 'Battery', 'Fee', 'Status', 'Payment', 'Actions']}>
        {reservations.map((r) => {
          const station = state.stations.find((s) => s.id === r.stationId);
          const battery = state.batteries.find((b) => b.id === r.batteryId);
          return (
            <tr key={r.id} className="hover:bg-slate-50">
              <Td className="font-mono text-xs font-semibold"><Link className="text-blue-600 hover:underline" to={`/owner/reservations/${r.id}`}>{r.id}</Link></Td>
              <Td>{station?.name ?? r.stationId}</Td>
              <Td>{formatDateTime(r.slot)}</Td>
              <Td>{r.batteryId}<span className="block text-xs text-slate-400">{battery?.batteryType} · {battery?.capacityKWh} kWh</span></Td>
              <Td>{formatINR(r.estimatedFee)}</Td>
              <Td><StatusBadge status={r.status} /></Td>
              <Td><StatusBadge status={r.paymentStatus} /></Td>
              <Td>
                <div className="flex gap-2">
                  {r.status === 'PENDING_PAYMENT' && <Button size="sm" onClick={() => setPayFor(r)}>{r.paymentStatus === 'FAILED' ? 'Retry pay' : 'Pay'}</Button>}
                  {canCancel(state, r) && <Button size="sm" variant="secondary" onClick={() => setCancelId(r.id)}>Cancel</Button>}
                  <Link to={`/owner/reservations/${r.id}`}><Button size="sm" variant="ghost">Details</Button></Link>
                </div>
              </Td>
            </tr>
          );
        })}
      </Table>
      <ConfirmDialog open={!!cancelId} danger title="Cancel this reservation?"
        message={<>Reservation <b>{cancelId}</b> will be cancelled, the battery released back to inventory, and any simulated digital payment refunded.</>}
        confirmLabel="Cancel reservation" onCancel={() => setCancelId(null)}
        onConfirm={() => { run((s) => cancelReservation(s, cancelId!), 'Reservation cancelled and battery released.'); setCancelId(null); }} />
      {livePay && <PaymentModal reservation={livePay} open onClose={() => setPayFor(null)} />}
    </>
  );
}
