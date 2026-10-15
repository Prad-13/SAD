import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button, Card, EmptyState, PageHeader, inputClass } from '../../components/ui';
import ReservationList from '../../components/ReservationList';
import { ownerReservations } from '../../services/selectors';
import { humanize } from '../../utils/format';

export default function MyReservations() {
  const { state, user } = useApp();
  const [filter, setFilter] = useState('');
  const all = ownerReservations(state, user!.id);
  const list = filter ? all.filter((r) => r.status === filter) : all;
  return (
    <>
      <PageHeader title="My Reservations & Swap History" subtitle="Track reservations, payments and completed swaps."
        actions={<select aria-label="Filter by status" className={inputClass + ' w-44'} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All statuses</option>{['PENDING_PAYMENT', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
        </select>} />
      <Card>
        {list.length === 0 ? <EmptyState icon={ClipboardList} title="No reservations" message="Reserve a battery to see it here."
          action={<Link to="/owner/stations"><Button>Find a station</Button></Link>} /> : <ReservationList reservations={list} />}
      </Card>
    </>
  );
}
