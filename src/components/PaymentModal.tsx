import { useState } from 'react';
import { Banknote, CheckCircle2, CreditCard, Smartphone, XCircle } from 'lucide-react';
import type { Payment, PaymentMethod, Reservation } from '../types';
import { useApp } from '../context/AppContext';
import { attemptPayment, validateCard, validateUpi } from '../services/paymentService';
import { Button, DemoNote, Field, Modal, StatusBadge, inputClass } from './ui';
import { cn, formatDateTime, formatINR } from '../utils/format';

const METHODS: { id: PaymentMethod; label: string; icon: typeof Banknote; hint: string }[] = [
  { id: 'UPI', label: 'UPI', icon: Smartphone, hint: 'Simulated UPI' },
  { id: 'CARD', label: 'Card', icon: CreditCard, hint: 'Simulated card' },
  { id: 'CASH', label: 'Cash at station', icon: Banknote, hint: 'Pay the operator' },
];

export function Receipt({ payment, reservation }: { payment: Payment; reservation: Reservation }) {
  const rows: [string, string][] = [
    ['Receipt for', reservation.id],
    ['Transaction ref', payment.transactionReference],
    ['Method', payment.method === 'CASH' ? 'Cash at station' : payment.method],
    ['Amount', formatINR(payment.amount)],
    ['Date', formatDateTime(payment.createdAt)],
  ];
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold">Payment receipt</span>
        <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">Simulated</span>
      </div>
      <dl className="space-y-1">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4"><dt className="text-slate-500">{k}</dt><dd className="break-all text-right font-medium">{v}</dd></div>
        ))}
        <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd><StatusBadge status={payment.status} /></dd></div>
      </dl>
    </div>
  );
}

export default function PaymentModal({ reservation, open, onClose }: { reservation: Reservation; open: boolean; onClose: () => void }) {
  const { run } = useApp();
  const [method, setMethod] = useState<PaymentMethod>('UPI');
  const [outcome, setOutcome] = useState<'SUCCESS' | 'FAILURE'>('SUCCESS');
  const [upi, setUpi] = useState('');
  const [card, setCard] = useState({ number: '', expiry: '', cvv: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<Payment | null>(null);

  const pay = () => {
    if (busy) return; // guards against double clicks while "processing"
    setError('');
    if (method === 'UPI') { const e = validateUpi(upi); if (e) return setError(e); }
    if (method === 'CARD') { const e = validateCard(card.number, card.expiry, card.cvv); if (e) return setError(e); }
    setBusy(true);
    setTimeout(() => {
      const p = run((s) => attemptPayment(s, { reservationId: reservation.id, method, outcome }));
      setBusy(false);
      if (p) setLast(p);
    }, 700);
  };

  const close = () => { setLast(null); setError(''); onClose(); };
  const failed = last?.status === 'FAILED';

  return (
    <Modal open={open} onClose={close} title="Pay for reservation (simulated)">
      <DemoNote>Simulated payment — no real money or card data is processed or stored.</DemoNote>
      <div className="my-4 flex items-baseline justify-between">
        <span className="text-sm text-slate-500">Amount due ({reservation.id})</span>
        <span className="text-2xl font-bold">{formatINR(reservation.estimatedFee)}</span>
      </div>

      {last && !failed ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-emerald-700"><CheckCircle2 className="h-5 w-5" />
            <span className="font-semibold">{last.method === 'CASH' ? 'Reservation confirmed — pay cash at the station.' : 'Payment successful — reservation confirmed.'}</span></div>
          <Receipt payment={last} reservation={reservation} />
          <Button className="w-full" onClick={close}>Done</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {failed && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Payment failed (ref {last!.transactionReference}). You have not been charged. Your battery is still held — retry, switch method, or cancel the reservation.</span>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            {METHODS.map(({ id, label, icon: Icon, hint }) => (
              <button key={id} type="button" onClick={() => { setMethod(id); setError(''); }}
                className={cn('rounded-lg border p-3 text-center text-xs font-medium', method === id ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>
                <Icon className="mx-auto mb-1 h-5 w-5" />{label}<span className="block text-[10px] font-normal text-slate-400">{hint}</span>
              </button>
            ))}
          </div>

          {method === 'UPI' && (
            <Field label="UPI ID"><input className={inputClass} placeholder="name@bank" value={upi} onChange={(e) => setUpi(e.target.value)} /></Field>
          )}
          {method === 'CARD' && (
            <div className="space-y-3">
              <Field label="Card number (use any 16 digits)"><input className={inputClass} inputMode="numeric" placeholder="4242 4242 4242 4242" maxLength={19} value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Expiry (MM/YY)"><input className={inputClass} placeholder="12/30" maxLength={5} value={card.expiry} onChange={(e) => setCard({ ...card, expiry: e.target.value })} /></Field>
                <Field label="CVV"><input className={inputClass} inputMode="numeric" type="password" maxLength={3} placeholder="123" value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value })} /></Field>
              </div>
            </div>
          )}
          {method === 'CASH' && <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Your reservation will be confirmed now. Pay {formatINR(reservation.estimatedFee)} in cash to the operator when you swap.</p>}

          {method !== 'CASH' && (
            <fieldset className="rounded-lg border border-slate-200 p-3">
              <legend className="px-1 text-xs font-semibold uppercase text-slate-500">Demo gateway result</legend>
              {(['SUCCESS', 'FAILURE'] as const).map((o) => (
                <label key={o} className="flex items-center gap-2 py-1 text-sm">
                  <input type="radio" name="outcome" checked={outcome === o} onChange={() => setOutcome(o)} />
                  {o === 'SUCCESS' ? 'Simulate successful payment' : 'Simulate failed payment'}
                </label>
              ))}
            </fieldset>
          )}

          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={close}>Close</Button>
            <Button loading={busy} onClick={pay}>{failed ? 'Retry payment' : method === 'CASH' ? 'Confirm (pay at station)' : `Pay ${formatINR(reservation.estimatedFee)}`}</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
