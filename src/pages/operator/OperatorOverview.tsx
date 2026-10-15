import { Link } from 'react-router-dom';
import { CalendarClock, MapPin } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button, Card, EmptyState, PageHeader, StatusBadge, Table, Td } from '../../components/ui';
import { countByStatus } from '../../services/inventoryService';
import { BATTERY_STATUSES } from '../../types';
import { formatDateTime, formatINR } from '../../utils/format';

export default function OperatorOverview() {
  const { state, user } = useApp();
  const station = state.stations.find((s) => s.id === user!.stationId);
  if (!station) return <Card><EmptyState icon={MapPin} title="No station assigned" message="This operator account has no station." /></Card>;
  const counts = countByStatus(state, station.id);
  const upcoming = state.reservations.filter((r) => r.stationId === station.id && (r.status === 'CONFIRMED' || r.status === 'PENDING_PAYMENT'))
    .sort((a, b) => a.slot.localeCompare(b.slot));
  const todaysSwaps = state.swaps.filter((s) => s.stationId === station.id && s.status === 'COMPLETED' && s.completedAt && new Date(s.completedAt).toDateString() === new Date().toDateString()).length;

  return (
    <>
      <PageHeader title={station.name} subtitle={station.address}
        actions={<Link to="/operator/swaps"><Button>Manage swaps</Button></Link>} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <h2 className="mb-3 font-semibold">Station</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd><StatusBadge status={station.status} /></dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Supported</dt><dd>{station.supportedBatteryTypes.join(', ')}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Price / swap</dt><dd>{formatINR(station.pricePerSwap)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Swaps completed today</dt><dd className="font-semibold">{todaysSwaps}</dd></div>
          </dl>
        </Card>
        <Card className="p-5 md:col-span-2">
          <h2 className="mb-3 font-semibold">Batteries by status</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {BATTERY_STATUSES.map((st) => <div key={st} className="rounded-lg border border-slate-200 p-3"><StatusBadge status={st} /><p className="mt-1 text-2xl font-bold">{counts[st]}</p></div>)}
          </div>
        </Card>
      </div>
      <Card className="mt-6">
        <div className="border-b border-slate-200 p-4"><h2 className="font-semibold">Upcoming reservations at this station</h2></div>
        {upcoming.length === 0 ? <EmptyState icon={CalendarClock} title="No upcoming reservations" /> : (
          <Table headers={['Reservation', 'Customer', 'Slot', 'Battery', 'Status', 'Payment']}>
            {upcoming.map((r) => (
              <tr key={r.id}><Td className="font-mono text-xs font-semibold">{r.id}</Td>
                <Td>{state.users.find((u) => u.id === r.ownerId)?.name}</Td><Td>{formatDateTime(r.slot)}</Td><Td>{r.batteryId}</Td>
                <Td><StatusBadge status={r.status} /></Td><Td><StatusBadge status={r.paymentStatus} /></Td></tr>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}
