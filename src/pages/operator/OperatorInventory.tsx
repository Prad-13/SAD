import { useApp } from '../../context/AppContext';
import { Button, Card, DemoNote, PageHeader } from '../../components/ui';
import BatteryTable from '../../components/BatteryTable';
import { BATTERY_TRANSITIONS } from '../../services/constants';
import { transitionBattery } from '../../services/inventoryService';
import { humanize } from '../../utils/format';

const LABEL: Record<string, string> = { AVAILABLE: 'Mark charge complete', CHARGING: 'Start charging', MAINTENANCE: 'Send to maintenance' };

export default function OperatorInventory() {
  const { state, user, run } = useApp();
  const stationId = user!.stationId!;
  const batteries = state.batteries.filter((b) => b.stationId === stationId);
  return (
    <>
      <PageHeader title="Battery Inventory" subtitle={`Batteries at ${state.stations.find((s) => s.id === stationId)?.name}`} />
      <div className="mb-4"><DemoNote>Status can only change along valid transitions. RESERVED and IN_USE are set automatically by reservations and swaps. “Mark charge complete” records the battery as fully charged.</DemoNote></div>
      <Card>
        <BatteryTable state={state} batteries={batteries} actions={(b) => {
          const next = BATTERY_TRANSITIONS[b.status];
          if (!next.length) return <span className="text-xs text-slate-400">Managed by workflow</span>;
          return (
            <div className="flex gap-2">
              {next.map((to) => (
                <Button key={to} size="sm" variant={to === 'MAINTENANCE' ? 'secondary' : 'primary'}
                  onClick={() => run((s) => transitionBattery(s, b.id, to), `${b.id} → ${humanize(to)}`)}>{LABEL[to] ?? humanize(to)}</Button>
              ))}
            </div>
          );
        }} />
      </Card>
    </>
  );
}
