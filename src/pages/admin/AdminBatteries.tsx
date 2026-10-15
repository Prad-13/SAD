import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import type { Battery, BatteryStatus, BatteryType } from '../../types';
import { BATTERY_TYPES } from '../../types';
import { useApp } from '../../context/AppContext';
import { Button, Card, DemoNote, Field, Modal, PageHeader, inputClass } from '../../components/ui';
import BatteryTable from '../../components/BatteryTable';
import { BATTERY_TRANSITIONS } from '../../services/constants';
import { addBattery, updateBattery, validateBatteryInput } from '../../services/inventoryService';
import { humanize } from '../../utils/format';

export default function AdminBatteries() {
  const { state, run } = useApp();
  const [form, setForm] = useState<Battery | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [original, setOriginal] = useState<Battery | null>(null);

  const open = (b: Battery | null) => {
    setIsNew(!b); setOriginal(b);
    setForm(b ? { ...b } : { id: '', stationId: state.stations[0]?.id ?? '', batteryType: 'VS-48V', capacityKWh: 1.5, chargePercentage: 100, healthPercentage: 100, status: 'AVAILABLE' });
    setErrors({});
  };
  const submit = () => {
    if (!form) return;
    const e = validateBatteryInput(state, form, !isNew);
    setErrors(e);
    if (Object.keys(e).length) return;
    const ok = isNew ? run((s) => addBattery(s, form), `Battery ${form.id} added.`) : run((s) => updateBattery(s, form), `Battery ${form.id} updated.`);
    if (ok) setForm(null);
  };
  const locked = !isNew && (original?.status === 'RESERVED' || original?.status === 'IN_USE');
  // Status choices: current status + valid transitions (new batteries may start in any non-RESERVED state).
  const statusOptions: BatteryStatus[] = isNew ? ['AVAILABLE', 'CHARGING', 'NEEDS_CHARGING', 'MAINTENANCE', 'IN_USE']
    : original ? [original.status, ...BATTERY_TRANSITIONS[original.status]] : [];
  const num = (k: 'capacityKWh' | 'chargePercentage' | 'healthPercentage', v: string) => form && setForm({ ...form, [k]: v === '' ? NaN : Number(v) });
  const val = (n: number) => (Number.isNaN(n) ? '' : n);

  return (
    <>
      <PageHeader title="Manage Batteries" subtitle="Add, edit and review every battery record."
        actions={<Button onClick={() => open(null)}><Plus className="h-4 w-4" />Add battery</Button>} />
      <Card>
        <BatteryTable state={state} batteries={state.batteries} showCapacity
          actions={(b) => <Button size="sm" variant="secondary" onClick={() => open(b)}><Pencil className="h-3.5 w-3.5" />Edit</Button>} />
      </Card>

      <Modal open={!!form} onClose={() => setForm(null)} title={isNew ? 'Add battery' : `Edit ${form?.id}`}>
        {form && (
          <div className="space-y-4">
            {locked && <DemoNote>This battery is {original?.status}. Its status, type and station are managed by the reservation/swap workflow; you can still edit charge, health and capacity.</DemoNote>}
            <Field label="Battery ID" error={errors.id} hint="Must be unique, e.g. BAT-4810">
              <input className={inputClass} disabled={!isNew} value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value.toUpperCase() })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type" error={errors.batteryType}><select className={inputClass} disabled={locked} value={form.batteryType} onChange={(e) => setForm({ ...form, batteryType: e.target.value as BatteryType })}>
                {BATTERY_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
              <Field label="Station" error={errors.stationId}><select className={inputClass} disabled={locked} value={form.stationId} onChange={(e) => setForm({ ...form, stationId: e.target.value })}>
                {state.stations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Capacity (kWh)" error={errors.capacityKWh}><input type="number" step="0.1" className={inputClass} value={val(form.capacityKWh)} onChange={(e) => num('capacityKWh', e.target.value)} /></Field>
              <Field label="Charge (%)" error={errors.chargePercentage}><input type="number" className={inputClass} value={val(form.chargePercentage)} onChange={(e) => num('chargePercentage', e.target.value)} /></Field>
              <Field label="Health (%)" error={errors.healthPercentage}><input type="number" className={inputClass} value={val(form.healthPercentage)} onChange={(e) => num('healthPercentage', e.target.value)} /></Field>
            </div>
            <Field label="Status" error={errors.status}><select className={inputClass} disabled={locked} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as BatteryStatus })}>
              {statusOptions.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</select></Field>
            <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button><Button onClick={submit}>{isNew ? 'Add battery' : 'Save changes'}</Button></div>
          </div>
        )}
      </Modal>
    </>
  );
}
