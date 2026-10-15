import { Link } from 'react-router-dom';
import { BatteryCharging, CalendarClock, CheckCircle2, History, MapPin } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button, Card, EmptyState, PageHeader, StatCard, StatusBadge, Table, Td } from '../../components/ui';
import StationCard from '../../components/StationCard';
import { isActiveReservation } from '../../services/constants';
import { isReservable } from '../../services/batteryService';
import { ownerReservations } from '../../services/selectors';
import { formatDateTime } from '../../utils/format';

export default function OwnerDashboard() {
  const { state, user } = useApp();
  const me = user!;
  const vehicles = state.vehicles.filter((v) => v.ownerId === me.id);
  const types = vehicles.map((v) => v.batteryType);
  const mine = ownerReservations(state, me.id);
  const current = mine.find(isActiveReservation);
  const completed = state.swaps.filter((s) => s.status === 'COMPLETED' && mine.some((r) => r.id === s.reservationId));
  const compatibleAvailable = state.batteries.filter((b) => types.includes(b.batteryType) && isReservable(state, b) &&
    state.stations.find((s) => s.id === b.stationId)?.status === 'OPEN');
  const stations = [...state.stations].sort((a, b) => a.demoDistanceKm - b.demoDistanceKm).slice(0, 3);
  const history = completed.slice().sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? '')).slice(0, 5);

  return (
    <>
      <PageHeader title={`Welcome back, ${me.name.split(' ')[0]}`}
        subtitle={vehicles.map((v) => `${v.registrationNumber} · ${v.model} · ${v.batteryType}`).join(' | ')}
        actions={<Link to="/owner/stations"><Button><MapPin className="h-4 w-4" />Find a station</Button></Link>} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Completed swaps" value={completed.length} icon={CheckCircle2} tone="green" />
        <StatCard label="Compatible charged batteries" value={compatibleAvailable.length} icon={BatteryCharging} tone="blue" />
        <StatCard label="Active reservation" value={current ? 1 : 0} icon={CalendarClock} tone="amber" />
      </div>

      <Card className="mt-6 p-5">
        <h2 className="mb-3 font-semibold">Current reservation</h2>
        {current ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <p className="font-mono font-semibold">{current.id}</p>
              <p className="text-slate-500">{state.stations.find((s) => s.id === current.stationId)?.name} · {formatDateTime(current.slot)} · Battery {current.batteryId}</p>
            </div>
            <div className="flex items-center gap-2"><StatusBadge status={current.status} /><StatusBadge status={current.paymentStatus} />
              <Link to={`/owner/reservations/${current.id}`}><Button size="sm">View</Button></Link></div>
          </div>
        ) : <p className="text-sm text-slate-500">You have no active reservation. Find a station to reserve a charged battery.</p>}
      </Card>

      <h2 className="mb-3 mt-8 font-semibold">Nearby stations <span className="text-xs font-normal text-slate-400">(distances are demo data)</span></h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stations.map((s) => <StationCard key={s.id} station={s} state={state} ownerBatteryTypes={types} />)}
      </div>

      <Card className="mt-8">
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <h2 className="font-semibold">Recent swap history</h2>
          <Link to="/owner/reservations" className="text-sm font-medium text-blue-600">View all</Link>
        </div>
        {history.length === 0 ? <EmptyState icon={History} title="No completed swaps yet" message="Completed swaps will appear here." /> : (
          <Table headers={['Swap', 'Reservation', 'Station', 'Completed', 'Issued battery', 'Returned']}>
            {history.map((s) => (
              <tr key={s.id}>
                <Td className="font-mono text-xs">{s.id}</Td><Td className="font-mono text-xs">{s.reservationId}</Td>
                <Td>{state.stations.find((x) => x.id === s.stationId)?.name}</Td><Td>{formatDateTime(s.completedAt)}</Td>
                <Td>{s.assignedBatteryId}</Td><Td>{s.returnedBatteryId}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}
