import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Car } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button, Card, ChargeBar, DemoNote, EmptyState, Field, PageHeader, inputClass } from '../../components/ui';
import { reservableBatteries } from '../../services/inventoryService';
import { computeFee, createReservation, generateSlots } from '../../services/reservationService';
import { cn, formatDateTime, formatINR } from '../../utils/format';

export default function ReserveBattery() {
  const { state, user, run } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const vehicles = state.vehicles.filter((v) => v.ownerId === user!.id);

  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? '');
  const [stationId, setStationId] = useState(params.get('stationId') ?? '');
  const requestedBattery = params.get('batteryId') ?? '';
  const [batteryId, setBatteryId] = useState('');
  const [slot, setSlot] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const vehicle = vehicles.find((v) => v.id === vehicleId);
  const stations = state.stations.filter((s) => s.status === 'OPEN' && vehicle && s.supportedBatteryTypes.includes(vehicle.batteryType));
  const station = state.stations.find((s) => s.id === stationId);
  const batteries = useMemo(() => (vehicle && station ? reservableBatteries(state, station.id, vehicle.batteryType) : []), [state, vehicle, station]);
  const slots = station ? generateSlots(state, station.id) : [];
  const fee = station ? computeFee(station) : null;

  // The battery picked from a station-details link; if it was taken meanwhile we say so instead of silently ignoring it.
  const requested = requestedBattery ? state.batteries.find((b) => b.id === requestedBattery) : undefined;
  const requestedProblem = requestedBattery && station && !batteries.some((b) => b.id === requestedBattery)
    ? `Battery ${requestedBattery} is not available for reservation${requested ? ` (status: ${requested.status}, ${requested.batteryType})` : ' (not found)'}. Please pick another one.`
    : '';
  const effectiveBattery = batteryId || (requestedBattery && batteries.some((b) => b.id === requestedBattery) ? requestedBattery : '');

  if (!vehicles.length) return <Card><EmptyState icon={Car} title="No vehicle registered" message="Register a vehicle (demo accounts have one) to reserve a battery." /></Card>;

  const submit = () => {
    const e: Record<string, string> = {};
    if (!vehicleId) e.vehicle = 'Select a vehicle.';
    if (!stationId) e.station = 'Select a station.';
    if (!effectiveBattery) e.battery = 'Select a battery.';
    if (!slot) e.slot = 'Choose a time slot.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSubmitting(true);
    const r = run((s) => createReservation(s, { ownerId: user!.id, vehicleId, stationId, batteryId: effectiveBattery, slot }),
      (res) => `Reservation ${res.id} created. Complete payment to confirm it.`);
    setSubmitting(false);
    if (r) navigate(`/owner/reservations/${r.id}?pay=1`);
  };

  return (
    <>
      <PageHeader title="Reserve a Battery" subtitle="Pick a vehicle, station, charged battery and time slot." />
      {requestedProblem && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{requestedProblem}</div>
      )}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="space-y-5 p-5 lg:col-span-2">
          <Field label="1. Vehicle" error={errors.vehicle}>
            <select className={inputClass} value={vehicleId} onChange={(e) => { setVehicleId(e.target.value); setStationId(''); setBatteryId(''); setSlot(''); }}>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.registrationNumber} — {v.model} ({v.batteryType})</option>)}
            </select>
          </Field>
          <Field label="2. Station" error={errors.station} hint={`Only open stations supporting ${vehicle?.batteryType} are listed.`}>
            <select className={inputClass} value={stationId} onChange={(e) => { setStationId(e.target.value); setBatteryId(''); setSlot(''); }}>
              <option value="">Select a station…</option>
              {stations.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.demoDistanceKm} km, demo)</option>)}
            </select>
          </Field>
          <Field label="3. Compatible charged battery" error={errors.battery}>
            {!station ? <p className="text-sm text-slate-400">Select a station first.</p>
              : batteries.length === 0 ? <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">No compatible charged battery is available at this station right now. Try another station.</p>
              : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {batteries.map((b) => (
                    <button type="button" key={b.id} onClick={() => setBatteryId(b.id)}
                      className={cn('rounded-lg border p-3 text-left text-sm', effectiveBattery === b.id ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'border-slate-200 hover:bg-slate-50')}>
                      <span className="font-mono font-semibold">{b.id}</span>
                      <span className="block text-xs text-slate-500">{b.batteryType} · {b.capacityKWh} kWh · health {b.healthPercentage}%</span>
                      <ChargeBar value={b.chargePercentage} />
                    </button>
                  ))}
                </div>
              )}
          </Field>
          <Field label="4. Time slot (demo)" error={errors.slot}>
            {!station ? <p className="text-sm text-slate-400">Select a station first.</p> : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {slots.map((s) => (
                  <button type="button" key={s.iso} disabled={s.remaining === 0} onClick={() => setSlot(s.iso)}
                    className={cn('rounded-lg border px-2 py-2 text-xs disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400',
                      slot === s.iso ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'border-slate-200 hover:bg-slate-50')}>
                    {formatDateTime(s.iso)}<span className="block text-[10px] text-slate-500">{s.remaining === 0 ? 'Full' : `${s.remaining} left`}</span>
                  </button>
                ))}
              </div>
            )}
          </Field>
        </Card>

        <Card className="h-fit p-5">
          <h2 className="mb-3 font-semibold">Review</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Vehicle</dt><dd>{vehicle?.registrationNumber ?? '—'}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Station</dt><dd className="text-right">{station?.name ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Battery</dt><dd>{effectiveBattery || '—'}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Slot</dt><dd className="text-right">{slot ? formatDateTime(slot) : '—'}</dd></div>
            <hr />
            <div className="flex justify-between"><dt className="text-slate-500">Swap fee</dt><dd>{fee ? formatINR(fee.base) : '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">GST (5%)</dt><dd>{fee ? formatINR(fee.gst) : '—'}</dd></div>
            <div className="flex justify-between text-base font-bold"><dt>Estimated fee</dt><dd>{fee ? formatINR(fee.total) : '—'}</dd></div>
          </dl>
          <div className="my-4"><DemoNote>Demo prices. Payment is simulated on the next screen.</DemoNote></div>
          <Button className="w-full" loading={submitting} onClick={submit}>Confirm reservation</Button>
        </Card>
      </div>
    </>
  );
}
