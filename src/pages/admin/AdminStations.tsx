import { useState } from 'react';
import { Boxes, Pencil, Plus } from 'lucide-react';
import type { BatteryType, Station, StationStatus } from '../../types';
import { BATTERY_TYPES } from '../../types';
import { useApp } from '../../context/AppContext';
import { Button, Card, Field, Modal, PageHeader, StatusBadge, Table, Td, inputClass } from '../../components/ui';
import BatteryTable from '../../components/BatteryTable';
import { countByStatus, saveStation, validateStationInput } from '../../services/batteryService';
import { formatINR } from '../../utils/format';

const blank: Station = { id: '', name: '', address: '', supportedBatteryTypes: [], status: 'OPEN', pricePerSwap: 100, slotCapacity: 2, demoDistanceKm: 5 };

export default function AdminStations() {
  const { state, run } = useApp();
  const [form, setForm] = useState<Station | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [viewId, setViewId] = useState<string | null>(null);
  const viewStation = state.stations.find((s) => s.id === viewId);

  const open = (s: Station | null) => { setIsNew(!s); setForm(s ? { ...s } : { ...blank }); setErrors({}); };
  const toggleType = (t: BatteryType) => form && setForm({ ...form, supportedBatteryTypes: form.supportedBatteryTypes.includes(t) ? form.supportedBatteryTypes.filter((x) => x !== t) : [...form.supportedBatteryTypes, t] });
  const submit = () => {
    if (!form) return;
    const e = validateStationInput(form);
    setErrors(e);
    if (Object.keys(e).length) return;
    if (run((s) => saveStation(s, form, isNew), isNew ? 'Station added.' : 'Station updated.')) setForm(null);
  };
  const num = (k: keyof Station) => (v: string) => form && setForm({ ...form, [k]: v === '' ? NaN : Number(v) });

  return (
    <>
      <PageHeader title="Manage Stations" subtitle="Add stations, edit details and change availability."
        actions={<Button onClick={() => open(null)}><Plus className="h-4 w-4" />Add station</Button>} />
      <Card>
        <Table headers={['Station', 'Supported types', 'Price', 'Slots/hr', 'Batteries (avail / total)', 'Status', 'Actions']}>
          {state.stations.map((s) => {
            const c = countByStatus(state, s.id);
            const total = state.batteries.filter((b) => b.stationId === s.id).length;
            return (
              <tr key={s.id}>
                <Td><span className="font-semibold">{s.name}</span><span className="block text-xs text-slate-400">{s.id} · {s.address}</span></Td>
                <Td>{s.supportedBatteryTypes.join(', ')}</Td><Td>{formatINR(s.pricePerSwap)}</Td><Td>{s.slotCapacity}</Td>
                <Td>{c.FULLY_CHARGED} / {total}</Td>
                <Td>
                  <select aria-label={`Availability of ${s.name}`} className={inputClass + ' w-36 py-1'} value={s.status}
                    onChange={(e) => run((st) => saveStation(st, { ...s, status: e.target.value as StationStatus }, false), `${s.name} is now ${e.target.value.toLowerCase()}.`)}>
                    <option value="OPEN">Open</option><option value="CLOSED">Closed</option><option value="MAINTENANCE">Maintenance</option>
                  </select>
                </Td>
                <Td><div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => open(s)}><Pencil className="h-3.5 w-3.5" />Edit</Button>
                  <Button size="sm" variant="secondary" onClick={() => setViewId(s.id)}><Boxes className="h-3.5 w-3.5" />Inventory</Button>
                </div></Td>
              </tr>
            );
          })}
        </Table>
      </Card>

      <Modal open={!!form} onClose={() => setForm(null)} title={isNew ? 'Add station' : `Edit ${form?.name}`}>
        {form && (
          <div className="space-y-4">
            <Field label="Name" error={errors.name}><input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Address" error={errors.address}><input className={inputClass} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
            <Field label="Supported battery types" error={errors.supportedBatteryTypes}>
              <div className="flex gap-4">{BATTERY_TYPES.map((t) => <label key={t} className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={form.supportedBatteryTypes.includes(t)} onChange={() => toggleType(t)} />{t}</label>)}</div>
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Price (₹)" error={errors.pricePerSwap}><input type="number" className={inputClass} value={Number.isNaN(form.pricePerSwap) ? '' : form.pricePerSwap} onChange={(e) => num('pricePerSwap')(e.target.value)} /></Field>
              <Field label="Slot capacity" error={errors.slotCapacity}><input type="number" className={inputClass} value={Number.isNaN(form.slotCapacity) ? '' : form.slotCapacity} onChange={(e) => num('slotCapacity')(e.target.value)} /></Field>
              <Field label="Demo distance (km)" error={errors.demoDistanceKm}><input type="number" step="0.1" className={inputClass} value={Number.isNaN(form.demoDistanceKm) ? '' : form.demoDistanceKm} onChange={(e) => num('demoDistanceKm')(e.target.value)} /></Field>
            </div>
            <Field label="Status"><select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as StationStatus })}>
              <option value="OPEN">Open</option><option value="CLOSED">Closed</option><option value="MAINTENANCE">Maintenance</option></select></Field>
            <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button><Button onClick={submit}>{isNew ? 'Add station' : 'Save changes'}</Button></div>
          </div>
        )}
      </Modal>

      <Modal wide open={!!viewStation} onClose={() => setViewId(null)} title={`Inventory — ${viewStation?.name}`}>
        {viewStation && (
          <>
            <div className="mb-3 flex items-center gap-2"><StatusBadge status={viewStation.status} /><span className="text-sm text-slate-500">{state.batteries.filter((b) => b.stationId === viewStation.id).length} batteries</span></div>
            <BatteryTable state={state} batteries={state.batteries.filter((b) => b.stationId === viewStation.id)} />
          </>
        )}
      </Modal>
    </>
  );
}
