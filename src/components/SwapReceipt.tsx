import type { AppState, SwapSession } from '../types';
import { receiptNumber } from '../services/swapService';
import { formatDateTime, formatINR } from '../utils/format';

/** Receipt generated when a swap is completed (activity diagram: "Generate receipt"). */
export default function SwapReceipt({ state, swap }: { state: AppState; swap: SwapSession }) {
  const r = state.reservations.find((x) => x.id === swap.reservationId);
  const station = state.stations.find((s) => s.id === swap.stationId);
  const vehicle = state.vehicles.find((v) => v.id === r?.vehicleId);
  const payment = state.payments.find((p) => p.reservationId === swap.reservationId && p.status === 'SUCCESS');
  const rows: [string, string][] = [
    ['Receipt no.', receiptNumber(swap.id)],
    ['Swap session', swap.id],
    ['Reservation', swap.reservationId],
    ['Station', station?.name ?? swap.stationId],
    ['Vehicle', vehicle?.registrationNumber ?? '—'],
    ['Battery issued', swap.assignedBatteryId],
    ['Battery returned', swap.returnedBatteryId ?? '—'],
    ['Completed', formatDateTime(swap.completedAt)],
    ['Amount', r ? formatINR(r.estimatedFee) : '—'],
    ['Paid via', payment ? `${payment.method} (${payment.transactionReference})` : '—'],
  ];
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold">Swap receipt</span>
        <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">Demo</span>
      </div>
      <dl className="space-y-1">
        {rows.map(([k, v]) => <div key={k} className="flex justify-between gap-4"><dt className="text-slate-500">{k}</dt><dd className="break-all text-right font-medium">{v}</dd></div>)}
      </dl>
    </div>
  );
}
