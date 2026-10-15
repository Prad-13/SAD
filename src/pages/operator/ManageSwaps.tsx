import { useState } from 'react';
import { CheckCircle2, Search, XCircle } from 'lucide-react';
import type { SwapSession } from '../../types';
import { useApp } from '../../context/AppContext';
import { Button, Card, ConfirmDialog, DemoNote, Field, PageHeader, StatusBadge, Table, Td, inputClass } from '../../components/ui';
import { abortSwap, completeSwap, startSwap } from '../../services/swapService';
import { formatDateTime, formatINR } from '../../utils/format';

/** Operator workflow: find → verify → compatibility → record returned battery → issue charged battery → confirm. */
export default function ManageSwaps() {
  const { state, user, run } = useApp();
  const stationId = user!.stationId!;
  const station = state.stations.find((s) => s.id === stationId);

  const [idInput, setIdInput] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null); // reservation currently being served
  const [returnedId, setReturnedId] = useState('');
  const [returnedCharge, setReturnedCharge] = useState('15');
  const [flagMaint, setFlagMaint] = useState(false);
  const [handedOver, setHandedOver] = useState(false);
  const [cashTaken, setCashTaken] = useState(false);
  const [done, setDone] = useState<SwapSession | null>(null);
  const [confirmAbort, setConfirmAbort] = useState(false);
  const [error, setError] = useState('');

  const reservation = activeId ? state.reservations.find((r) => r.id === activeId) : undefined;
  const session = activeId ? state.swaps.find((s) => s.reservationId === activeId && s.status === 'IN_PROGRESS') : undefined;
  const vehicle = reservation && state.vehicles.find((v) => v.id === reservation.vehicleId);
  const owner = reservation && state.users.find((u) => u.id === reservation.ownerId);
  const assigned = reservation && state.batteries.find((b) => b.id === reservation.batteryId);
  const candidates = vehicle ? state.batteries.filter((b) => b.status === 'IN_USE' && b.batteryType === vehicle.batteryType) : [];
  const cashDue = reservation?.paymentStatus === 'PAY_AT_STATION';

  const reset = () => {
    setActiveId(null); setIdInput(''); setReturnedId(''); setReturnedCharge('15'); setFlagMaint(false); setHandedOver(false); setCashTaken(false); setError('');
  };

  const verify = (id: string) => {
    setDone(null); setError('');
    const s = run((st) => startSwap(st, stationId, id));
    if (s) {
      const r = state.reservations.find((x) => x.id === s.reservationId)!;
      const v = state.vehicles.find((x) => x.id === r.vehicleId);
      setActiveId(s.reservationId);
      setReturnedId(v?.currentBatteryId && state.batteries.find((b) => b.id === v.currentBatteryId)?.status === 'IN_USE' ? v.currentBatteryId : '');
      setHandedOver(false); setCashTaken(false);
    } else setActiveId(null);
  };

  const complete = () => {
    const charge = Number(returnedCharge);
    if (!returnedId) return setError('Select the discharged battery returned by the customer.');
    if (!Number.isFinite(charge) || charge < 0 || charge > 100 || returnedCharge === '') return setError('Returned battery charge must be between 0 and 100.');
    if (!handedOver) return setError('Confirm that you physically handed over the charged battery.');
    if (cashDue && !cashTaken) return setError(`Confirm that ${formatINR(reservation!.estimatedFee)} cash was collected.`);
    setError('');
    const result = run((st) => completeSwap(st, { stationId, reservationId: reservation!.id, returnedBatteryId: returnedId, returnedCharge: charge, flagMaintenance: flagMaint }),
      'Swap recorded as completed.');
    if (result) { setDone(result); reset(); }
  };

  const queue = state.reservations.filter((r) => r.stationId === stationId && (r.status === 'CONFIRMED' || r.status === 'PENDING_PAYMENT'))
    .sort((a, b) => a.slot.localeCompare(b.slot));
  const recent = state.swaps.filter((s) => s.stationId === stationId && s.status !== 'IN_PROGRESS').sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? '')).slice(0, 6);

  return (
    <>
      <PageHeader title="Manage Swaps" subtitle={`${station?.name} — you record the swap that physically happens at the counter.`} />
      <div className="mb-4"><DemoNote>This system does not control any hardware. It records the exchange you perform by hand.</DemoNote></div>

      {done && (
        <Card className="mb-6 border-emerald-300 bg-emerald-50 p-5">
          <div className="flex items-center gap-2 text-emerald-800"><CheckCircle2 className="h-6 w-6" /><h2 className="text-lg font-bold">Swap completed</h2></div>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
            <div><dt className="text-emerald-700">Swap session</dt><dd className="font-mono font-semibold">{done.id}</dd></div>
            <div><dt className="text-emerald-700">Issued battery (now IN_USE)</dt><dd className="font-semibold">{done.assignedBatteryId}</dd></div>
            <div><dt className="text-emerald-700">Returned battery</dt><dd className="font-semibold">{done.returnedBatteryId}</dd></div>
            <div><dt className="text-emerald-700">Started</dt><dd>{formatDateTime(done.startedAt)}</dd></div>
            <div><dt className="text-emerald-700">Completed</dt><dd>{formatDateTime(done.completedAt)}</dd></div>
          </dl>
        </Card>
      )}

      <Card className="mb-6 p-5">
        <h2 className="mb-3 font-semibold">Step 1–2 · Find and verify reservation</h2>
        <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); verify(idInput); }}>
          <div className="min-w-60 flex-1"><Field label="Reservation ID">
            <div className="relative"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input className={inputClass + ' pl-9 font-mono'} placeholder="e.g. RSV-261015-K7Q2" value={idInput} onChange={(e) => setIdInput(e.target.value)} /></div>
          </Field></div>
          <Button type="submit">Verify &amp; start swap</Button>
        </form>
        <h3 className="mb-2 mt-5 text-sm font-semibold text-slate-600">Reservations for this station</h3>
        {queue.length === 0 ? <p className="text-sm text-slate-500">No open reservations.</p> : (
          <Table headers={['Reservation', 'Customer', 'Slot', 'Status', 'Payment', '']}>
            {queue.map((r) => (
              <tr key={r.id}><Td className="font-mono text-xs font-semibold">{r.id}</Td><Td>{state.users.find((u) => u.id === r.ownerId)?.name}</Td>
                <Td>{formatDateTime(r.slot)}</Td><Td><StatusBadge status={r.status} /></Td><Td><StatusBadge status={r.paymentStatus} /></Td>
                <Td><Button size="sm" variant="secondary" onClick={() => { setIdInput(r.id); verify(r.id); }}>Verify</Button></Td></tr>
            ))}
          </Table>
        )}
      </Card>

      {reservation && session && vehicle && assigned && (
        <Card className="mb-6 p-5">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Serving {reservation.id}</h2><StatusBadge status="IN_PROGRESS" /></div>

          <h3 className="mb-2 text-sm font-semibold text-slate-600">Step 3 · Vehicle & battery compatibility</h3>
          <div className="mb-5 grid gap-3 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-2">
            <div><span className="text-slate-500">Customer:</span> {owner?.name}</div>
            <div><span className="text-slate-500">Vehicle:</span> {vehicle.registrationNumber} · {vehicle.batteryType}</div>
            <div><span className="text-slate-500">Reserved battery:</span> {assigned.id} · {assigned.batteryType} · {assigned.chargePercentage}% charge</div>
            <div className="flex items-center gap-1 font-medium text-emerald-700"><CheckCircle2 className="h-4 w-4" />Compatible ({assigned.batteryType} = {vehicle.batteryType})</div>
            <div><span className="text-slate-500">Payment:</span> <StatusBadge status={reservation.paymentStatus} /></div>
          </div>

          <h3 className="mb-2 text-sm font-semibold text-slate-600">Step 4 · Record the discharged battery returned by the customer</h3>
          <div className="mb-5 grid gap-4 sm:grid-cols-3">
            <Field label="Returned battery (currently IN_USE)">
              <select className={inputClass} value={returnedId} onChange={(e) => setReturnedId(e.target.value)}>
                <option value="">Select…</option>
                {candidates.map((b) => <option key={b.id} value={b.id}>{b.id}{b.id === vehicle.currentBatteryId ? ' (vehicle’s current)' : ''}</option>)}
              </select>
            </Field>
            <Field label="Charge on return (%)"><input type="number" min={0} max={100} className={inputClass} value={returnedCharge} onChange={(e) => setReturnedCharge(e.target.value)} /></Field>
            <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={flagMaint} onChange={(e) => setFlagMaint(e.target.checked)} />Damaged — flag for maintenance</label>
          </div>

          <h3 className="mb-2 text-sm font-semibold text-slate-600">Step 5 · Issue the charged battery</h3>
          <div className="mb-5 space-y-2 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={handedOver} onChange={(e) => setHandedOver(e.target.checked)} />I physically handed over <b>{assigned.id}</b> to the customer and fitted it.</label>
            {cashDue && <label className="flex items-center gap-2"><input type="checkbox" checked={cashTaken} onChange={(e) => setCashTaken(e.target.checked)} />I collected <b>{formatINR(reservation.estimatedFee)}</b> cash (simulated).</label>}
          </div>

          {error && <p className="mb-3 flex items-center gap-1 text-sm font-medium text-red-600"><XCircle className="h-4 w-4" />{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button variant="success" onClick={complete}>Step 6 · Confirm swap completed</Button>
            <Button variant="secondary" onClick={() => setConfirmAbort(true)}>Abort swap</Button>
          </div>
        </Card>
      )}

      <Card>
        <div className="border-b border-slate-200 p-4"><h2 className="font-semibold">Recent swap sessions at this station</h2></div>
        {recent.length === 0 ? <p className="p-4 text-sm text-slate-500">No sessions yet.</p> : (
          <Table headers={['Session', 'Reservation', 'Issued', 'Returned', 'Completed', 'Status']}>
            {recent.map((s) => <tr key={s.id}><Td className="font-mono text-xs">{s.id}</Td><Td className="font-mono text-xs">{s.reservationId}</Td><Td>{s.assignedBatteryId}</Td><Td>{s.returnedBatteryId ?? '—'}</Td><Td>{formatDateTime(s.completedAt)}</Td><Td><StatusBadge status={s.status} /></Td></tr>)}
          </Table>
        )}
      </Card>

      <ConfirmDialog open={confirmAbort} title="Abort this swap?" message="The session is marked aborted. The reservation and battery stay reserved so you can verify it again."
        confirmLabel="Abort swap" onCancel={() => setConfirmAbort(false)}
        onConfirm={() => { run((st) => abortSwap(st, session!.id), 'Swap aborted. Reservation unchanged.'); setConfirmAbort(false); reset(); }} />
    </>
  );
}
