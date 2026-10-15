import { Link } from 'react-router-dom';
import { BatteryCharging, MapPin } from 'lucide-react';
import type { AppState, Station } from '../types';
import { Button, Card, StatusBadge } from './ui';
import { reservableBatteries } from '../services/inventoryService';
import { formatINR } from '../utils/format';

export default function StationCard({ station, state, ownerBatteryTypes }: { station: Station; state: AppState; ownerBatteryTypes: string[] }) {
  const available = reservableBatteries(state, station.id);
  const compatible = available.filter((b) => ownerBatteryTypes.includes(b.batteryType));
  const canReserve = station.status === 'OPEN' && compatible.length > 0;
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-slate-900">{station.name}</h3>
        <StatusBadge status={station.status} />
      </div>
      <p className="mt-1 flex items-start gap-1 text-sm text-slate-500"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{station.address}</p>
      <p className="mt-1 text-xs text-slate-400">{station.demoDistanceKm} km away (demo data)</p>
      <div className="my-4 flex items-center gap-3 rounded-lg bg-emerald-50 p-3">
        <BatteryCharging className="h-6 w-6 text-emerald-600" />
        <div className="text-sm">
          <p className="font-semibold text-emerald-800">{available.length} charged batteries available</p>
          <p className="text-xs text-emerald-700">{compatible.length} compatible with your vehicle</p>
        </div>
      </div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {station.supportedBatteryTypes.map((t) => <span key={t} className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{t}</span>)}
        <span className="ml-auto text-sm font-semibold">{formatIN(station.pricePerSwap)}<span className="text-xs font-normal text-slate-500"> / swap</span></span>
      </div>
      <div className="mt-auto flex gap-2">
        <Link to={`/owner/stations/${station.id}`} className="flex-1"><Button variant="secondary" className="w-full">View Details</Button></Link>
        {canReserve
          ? <Link to={`/owner/reserve?stationId=${station.id}`} className="flex-1"><Button className="w-full">Reserve Battery</Button></Link>
          : <Button className="flex-1" disabled title={station.status !== 'OPEN' ? 'Station is not open' : 'No compatible charged battery'}>Reserve Battery</Button>}
      </div>
    </Card>
  );
}
const formatIN = formatINR;
