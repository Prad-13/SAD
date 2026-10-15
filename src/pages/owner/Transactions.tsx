import { Link } from 'react-router-dom';
import { Banknote, Receipt, Undo2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Card, DemoNote, EmptyState, PageHeader, StatCard, StatusBadge, Table, Td } from '../../components/ui';
import { formatDateTime, formatINR } from '../../utils/format';

/** "View transaction history" use case: all simulated payments for this owner's reservations. */
export default function Transactions() {
  const { state, user } = useApp();
  const myIds = new Set(state.reservations.filter((r) => r.ownerId === user!.id).map((r) => r.id));
  const payments = state.payments.filter((p) => myIds.has(p.reservationId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const paid = payments.filter((p) => p.status === 'SUCCESS').reduce((a, p) => a + p.amount, 0);
  const refunded = payments.filter((p) => p.status === 'REFUNDED').reduce((a, p) => a + p.amount, 0);
  return (
    <>
      <PageHeader title="Transaction History" subtitle="Every payment attempt for your reservations." />
      <div className="mb-4"><DemoNote>All payments are simulated. No real money moved.</DemoNote></div>
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <StatCard label="Total paid" value={formatINR(paid)} icon={Banknote} tone="green" />
        <StatCard label="Refunded" value={formatINR(refunded)} icon={Undo2} tone="slate" />
      </div>
      <Card>
        {payments.length === 0 ? <EmptyState icon={Receipt} title="No transactions yet" message="Payments appear here after you reserve a battery." /> : (
          <Table headers={['Date', 'Payment', 'Reservation', 'Method', 'Amount', 'Reference', 'Status']}>
            {payments.map((p) => (
              <tr key={p.id}>
                <Td>{formatDateTime(p.createdAt)}</Td><Td className="font-mono text-xs">{p.id}</Td>
                <Td><Link className="font-mono text-xs text-blue-600 hover:underline" to={`/owner/reservations/${p.reservationId}`}>{p.reservationId}</Link></Td>
                <Td>{p.method}</Td><Td>{formatINR(p.amount)}</Td><Td className="font-mono text-xs">{p.transactionReference}</Td><Td><StatusBadge status={p.status} /></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}
