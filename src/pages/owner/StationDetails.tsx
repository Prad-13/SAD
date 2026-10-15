import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button, Card, ChargeBar, DemoNote, EmptyState, PageHeader, StatusBadge, Table, Td } from '../../components/ui';
import { countByStatus, isReservable } from '../../services/batteryService';
import { computeFee, generateSlots } from '../../services/reservationService';
import { BATTERY_STATUSES } from '../../types';
import { formatDateTime, formatINR, humanize } from '../../utils/format';

export default function StationDetails() {
  const { stationId } = useParams();
  const { state, user } = useApp();
  const station = state.stations.find((s) => s.id === stationId);
  if (!station) return <Card><EmptyState icon={MapPin} title="Station not found" action={<Link to="/owner/stations"><Button>Back to stations</Button></Link>} /></Card>;

  const myTypes = state.vehicles.filter((v) => v.ownerId === user!.id).map((v) => v.batteryType);
  const counts = countByStatus(state, station.id);
  const batteries = state.batteries.filter((b) => b.stationId === station.id);
  const bookable = batteries.filter((b) => isReservable(state, b) && myTypes.includes(b.batteryType));
  const slots = generateSlots(state, station.id).filter((s) => s.remaining > 0);
  const fee = computeFee(station);

  return (
    <>
      <Link to="/owner/stations" className="mb-3 inline-flex items-center gap-1 text-sm text-blue-600"><ArrowLeft className="h-4 w-4" />All stations</Link>
      <PageHeader title={station.name} subtitle={station.address}
        actions={<Link to={`/owner/reserve?stationId=${station.id}`}><Button disabled={station.status !== 'OPEN' || bookable.length === 0}>Reserve Battery</Button></Link>} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <h2 className="mb-3 font-semibold">Station information</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd><StatusBadge status={station.status} /></dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Distance</dt><dd>{station.demoDistanceKm} km (demo)</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Supported types</dt><dd>{station.supportedBatteryTypes.join(', ')}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Price per swap</dt><dd className="font-semibold">{formatINR(fee.base)} + {formatINR(fee.gst)} GST = {formatINR(fee.total)}</dd></div>
          </dl>
        </Card>
        <Card className="p-5 md:col-span-2">
          <h2 className="mb-3 font-semibold">Battery inventory by status</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {BATTERY_STATUSES.map((st) => (
              <div key={st} className="rounded-lg border border-slate-200 p-3"><StatusBadge status={st} /><p className="mt-1 text-2xl font-bold">{counts[st]}</p></div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <div className="border-b border-slate-200 p-4"><h2 className="font-semibold">Batteries you can reserve here</h2>
          <p className="text-xs text-slate-500">Only charged (≥90%), healthy, compatible batteries that nobody else has reserved are listed.</p></div>
        {bookable.length === 0 ? <EmptyState icon={MapPin} title="No compatible charged battery" message={`This station has none free for ${myTypes.join(', ')} right now.`} /> : (
          <Table headers={['Battery', 'Type', 'Capacity', 'Charge', 'Health', '']}>
            {bookable.map((b) => (
              <tr key={b.id}><Td className="font-mono text-xs font-semibold">{b.id}</Td><Td>{b.batteryType}</Td><Td>{b.capacityKWh} kWh</Td>
                <Td><ChargeBar value={b.chargePercentage} /></Td><Td>{b.healthPercentage}%</Td>
                <Td><Link to={`/owner/reserve?stationId=${station.id}&batteryId=${b.id}`}><Button size="sm" disabled={station.status !== 'OPEN'}>Reserve</Button></Link></Td></tr>
            ))}
          </Table>
        )}
      </Card>

      <Card className="mt-6">
        <div className="border-b border-slate-200 p-4"><h2 className="font-semibold">All batteries at this station</h2></div>
        <Table headers={['Battery', 'Type', 'Charge', 'Status']}>
          {batteries.map((b) => <tr key={b.id}><Td className="font-mono text-xs">{b.id}</Td><Td>{b.batteryType}</Td><Td><ChargeBar value={b.chargePercentage} /></Td><Td><StatusBadge status={b.status} /></Td></tr>)}
        </Table>
      </Card>

      <Card className="mt-6 p-5">
        <h2 className="mb-1 font-semibold">Available reservation slots (demo)</h2>
        <div className="mb-3"><DemoNote>Slots are generated demo times; each slot holds up to {station.slotCapacity} reservation(s).</DemoNote></div>
        {slots.length === 0 ? <p className="text-sm text-slate-500">No open slots.</p> : (
          <div className="flex flex-wrap gap-2">{slots.map((s) => <span key={s.iso} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs">{formatDateTime(s.iso)} <b className="text-emerald-600">· {s.remaining} left</b></span>)}</div>
        )}
        <p className="mt-3 text-xs text-slate-400">Statuses: {BATTERY_STATUSES.map(humanize).join(' · ')}</p>
      </Card>
    </>
  );
}
