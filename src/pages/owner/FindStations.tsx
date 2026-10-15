import { useMemo, useState } from 'react';
import { SearchX, Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Card, DemoNote, EmptyState, PageHeader, inputClass } from '../../components/ui';
import StationCard from '../../components/StationCard';
import { BATTERY_TYPES } from '../../types';
import { reservableBatteries } from '../../services/inventoryService';

export default function FindStations() {
  const { state, user } = useApp();
  const types = state.vehicles.filter((v) => v.ownerId === user!.id).map((v) => v.batteryType);
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [onlyAvail, setOnlyAvail] = useState(false);

  const list = useMemo(() => state.stations
    .filter((s) => (q ? `${s.name} ${s.address}`.toLowerCase().includes(q.toLowerCase()) : true))
    .filter((s) => (type ? s.supportedBatteryTypes.some((t) => t === type) : true))
    .filter((s) => (status ? s.status === status : true))
    .filter((s) => (onlyAvail ? reservableBatteries(state, s.id).length > 0 : true))
    .sort((a, b) => a.demoDistanceKm - b.demoDistanceKm), [state, q, type, status, onlyAvail]);

  return (
    <>
      <PageHeader title="Find Stations" subtitle="Search swap stations and check charged battery availability." />
      <div className="mb-4"><DemoNote>Distances and locations are fictional demo data. No maps service is used.</DemoNote></div>
      <Card className="mb-6 grid gap-3 p-4 md:grid-cols-4">
        <div className="relative md:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input aria-label="Search stations" className={inputClass + ' pl-9'} placeholder="Search name or address" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select aria-label="Battery type" className={inputClass} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All battery types</option>{BATTERY_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select aria-label="Station status" className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Any status</option><option value="OPEN">Open</option><option value="CLOSED">Closed</option><option value="MAINTENANCE">Maintenance</option>
        </select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyAvail} onChange={(e) => setOnlyAvail(e.target.checked)} />Only with charged batteries</label>
      </Card>
      {list.length === 0 ? <Card><EmptyState icon={SearchX} title="No stations match" message="Try clearing a filter or searching a different name." /></Card> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((s) => <StationCard key={s.id} station={s} state={state} ownerBatteryTypes={types} />)}
        </div>
      )}
    </>
  );
}
