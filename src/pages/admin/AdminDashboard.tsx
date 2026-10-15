import { Banknote, BatteryCharging, Boxes, CalendarCheck, Repeat, Warehouse } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApp } from '../../context/AppContext';
import { Card, PageHeader, StatCard, StatusBadge, Table, Td } from '../../components/ui';
import { adminMetrics, swapsPerDay } from '../../services/selectors';
import { countByStatus } from '../../services/batteryService';
import { BATTERY_STATUSES } from '../../types';
import { formatINR } from '../../utils/format';

export default function AdminDashboard() {
  const { state } = useApp();
  const m = adminMetrics(state);
  const data = swapsPerDay(state.swaps);
  const total = countByStatus(state);
  return (
    <>
      <PageHeader title="Admin Dashboard" subtitle="Live metrics computed from the current data (sample data, simulated revenue)." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total stations" value={m.stations} icon={Warehouse} tone="blue" />
        <StatCard label="Total batteries" value={m.batteries} icon={Boxes} tone="slate" />
        <StatCard label="Available batteries" value={m.availableBatteries} icon={BatteryCharging} tone="green" />
        <StatCard label="Active reservations" value={m.activeReservations} icon={CalendarCheck} tone="amber" />
        <StatCard label="Completed swaps" value={m.completedSwaps} icon={Repeat} tone="blue" />
        <StatCard label="Simulated revenue" value={formatINR(m.revenue)} icon={Banknote} tone="green" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-4 font-semibold">Completed swaps — last 7 days</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} /><YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={30} />
                <Tooltip /><Bar dataKey="swaps" fill="#16c768" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 font-semibold">Fleet by status</h2>
          <Table headers={['Status', 'Count']}>
            {BATTERY_STATUSES.map((s) => <tr key={s}><Td><StatusBadge status={s} /></Td><Td className="font-semibold">{total[s]}</Td></tr>)}
          </Table>
        </Card>
      </div>
    </>
  );
}
