import { useMemo, useState } from 'react';
import { SearchX, Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Card, DemoNote, EmptyState, PageHeader, inputClass } from '../../components/ui';
import StationCard from '../../components/StationCard';
import { BATTERY_TYPES } from '../../types';
import { nearestStationWithBattery, searchStations } from '../../services/stationSearchService';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui';

export default function FindStations() {
  const { state, user } = useApp();
  const types = state.vehicles.filter((v) => v.ownerId === user!.id).map((v) => v.batteryType);
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [onlyAvail, setOnlyAvail] = useState(false);

  const list = useMemo(() => searchStations(state, { q, batteryType: type, status, onlyWithCharged: onlyAvail }), [state, q, type, status, onlyAvail]);
  const nearest = types.length ? nearestStationWithBattery(state, types[0]) : undefined;

  return (
    <>
      <PageHeader title="Find Stations" subtitle="Search swap stations and check charged battery availability." />
      <div className="mb-4"><DemoNote>Distances and locations are fictional demo data. No maps service is used.</DemoNote></div>
      {nearest && (
        <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm text-emerald-900">Nearest station with a charged {types[0]} battery: <b>{nearest.name}</b> ({nearest.demoDistanceKm} km, demo)</p>
          <Link to={`/owner/reserve?stationId=${nearest.id}`}><Button variant="success" size="sm">Reserve here</Button></Link>
        </Card>
      )}
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
