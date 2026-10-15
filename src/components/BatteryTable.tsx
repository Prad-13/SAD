import { useMemo, useState, type ReactNode } from 'react';
import { Search, SearchX } from 'lucide-react';
import type { AppState, Battery } from '../types';
import { BATTERY_STATUSES } from '../types';
import { ChargeBar, EmptyState, StatusBadge, Table, Td, inputClass } from './ui';
import { humanize } from '../utils/format';

/** Searchable / filterable battery table shared by the operator inventory and admin battery pages. */
export default function BatteryTable({ state, batteries, actions, showCapacity }: {
  state: AppState; batteries: Battery[]; actions?: (b: Battery) => ReactNode; showCapacity?: boolean;
}) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const rows = useMemo(() => batteries
    .filter((b) => (status ? b.status === status : true))
    .filter((b) => (q ? `${b.id} ${b.batteryType}`.toLowerCase().includes(q.toLowerCase()) : true))
    .sort((a, b) => a.id.localeCompare(b.id)), [batteries, q, status]);

  const headers = ['Battery ID', 'Type', ...(showCapacity ? ['Capacity'] : []), 'Charge', 'Health', 'Status', 'Station', ...(actions ? ['Actions'] : [])];
  return (
    <div>
      <div className="flex flex-wrap gap-3 border-b border-slate-200 p-4">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input aria-label="Search batteries" className={inputClass + ' pl-9'} placeholder="Search by battery ID or type" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select aria-label="Filter by status" className={inputClass + ' w-48'} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>{BATTERY_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
        </select>
      </div>
      {rows.length === 0 ? <EmptyState icon={SearchX} title="No batteries found" message="Adjust the search or filter." /> : (
        <Table headers={headers}>
          {rows.map((b) => (
            <tr key={b.id} className="hover:bg-slate-50">
              <Td className="font-mono text-xs font-semibold">{b.id}</Td><Td>{b.batteryType}</Td>
              {showCapacity && <Td>{b.capacityKWh} kWh</Td>}
              <Td><ChargeBar value={b.chargePercentage} /></Td>
              <Td>{b.healthPercentage}%</Td><Td><StatusBadge status={b.status} /></Td>
              <Td>{state.stations.find((s) => s.id === b.stationId)?.name ?? b.stationId}</Td>
              {actions && <Td>{actions(b)}</Td>}
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
