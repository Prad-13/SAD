# VoltSwap — EV Battery Swap Station Management (prototype)

React + Vite + TypeScript + Tailwind v4 + React Router + Lucide + Recharts. No backend; all state is persisted in `localStorage`. **All data is fictional sample data and all payments are simulated.**

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build
```

## Demo script (≈5 min)

1. Log in as **Aarav Sharma** (EV Owner, VS-48V) → *Find Stations* → Koramangala → *Reserve Battery* → pick BAT-4801, a slot → *Confirm reservation*.
2. Payment modal: choose UPI, enter `aarav@upi`, select **Simulate failed payment** → failure shown, reservation stays *Pending payment* (battery still held). Select success → *Retry payment* → receipt, reservation *Confirmed*.
3. *Switch role* → **Meera Krishnan** (Operator, Koramangala) → *Manage Swaps* → paste the reservation ID → *Verify & start swap* → select returned battery (BAT-4890), tick "handed over" → *Confirm swap completed*.
4. Try verifying the same ID again → "already completed" error (rule 6).
5. Back as Aarav → *My Reservations* shows the Completed swap. As **Vikram Rao** (Admin) the dashboard, inventory and revenue have updated; *Reports* exports CSV.
6. Failure paths: open `/owner/reserve?stationId=STN-1001&batteryId=BAT-6001` (reserved battery) → rejected; cancel a reservation → battery returns to Available; sidebar *Reset demo data* restores the seed.

## Folder structure

```
src/
  types/index.ts          All entities (User, Vehicle, Station, Battery, Reservation, SwapSession, Payment) + AppState
  data/seed.ts            Fictional seed data (3 stations, 18 batteries, 3 owners, history)
  services/               BUSINESS LOGIC — pure functions: (state, input) => { state, result }, throw on rule violation
    constants.ts            charge threshold, GST, valid battery status transitions
    inventoryService.ts     reservability, counts, status transitions, battery/station CRUD + validation
    reservationService.ts   slots, fee, create (locks battery), cancel (releases battery, refunds)
    paymentService.ts       simulated UPI/Card/Cash, duplicate-charge protection
    swapService.ts          verify, start, complete, abort a swap
    selectors.ts            derived dashboard metrics (nothing hardcoded)
    storage.ts              safe localStorage load/save (falls back to seed on bad data)
  context/AppContext.tsx  State holder: run(serviceFn) commits state + persists + toasts errors
  components/             Reusable UI (ui.tsx primitives, Layout, PaymentModal, StationCard, BatteryTable, ReservationList)
  pages/{owner,operator,admin}/   One file per screen; role-guarded in App.tsx
```

UI never mutates data directly: pages call `run(s => someService(s, input))`. If a rule is violated the service throws, state is untouched and an error toast shows.

## Key business logic (viva cheat-sheet)

- **Reservable battery** = status `AVAILABLE` ∧ charge ≥ 90 ∧ health ≥ 70 ∧ same type as vehicle ∧ no active reservation (`isReservable`).
- **No double booking**: `createReservation` sets the battery to `RESERVED` in the same state update; a second attempt sees a non-AVAILABLE battery and is rejected. One active reservation per vehicle; slot capacity per station.
- **Reservation lifecycle**: `PENDING_PAYMENT → CONFIRMED → COMPLETED`, or `CANCELLED` from the first two. Cancel releases the battery (`RESERVED → AVAILABLE`) and refunds a successful payment (simulated).
- **Payments**: success → payment `SUCCESS`, reservation `PAID`/`CONFIRMED`. Failure → payment `FAILED`, reservation stays `PENDING_PAYMENT` with `FAILED` (never recorded as success); retry allowed. A reservation with a SUCCESS/PENDING payment rejects new attempts (no duplicate charge). Cash → confirmed, `PAY_AT_STATION`, settled when the operator completes the swap.
- **Swap**: operator verifies (exists, this station, CONFIRMED, battery still RESERVED and compatible) → `IN_PROGRESS` session; completion atomically marks the issued battery `IN_USE`, the returned battery `NEEDS_CHARGING` (or `MAINTENANCE` if flagged), reservation `COMPLETED`, session `COMPLETED` with timestamps. Completed reservations cannot be verified again.
- **Battery transitions** (`BATTERY_TRANSITIONS`): AVAILABLE→MAINTENANCE; CHARGING→AVAILABLE/MAINTENANCE; NEEDS_CHARGING→CHARGING/MAINTENANCE; MAINTENANCE→CHARGING. RESERVED/IN_USE only change via reservation/swap workflows.
- **Metrics** are computed from state on each render (`selectors.ts`); revenue = sum of `SUCCESS` payments (refunds excluded).

## Known limitations

- Single-browser prototype: `localStorage` is not shared across browsers/devices, and there are no real accounts.
- Pending-payment reservations hold their battery until paid or cancelled (no automatic expiry timer).
- Owners cannot add vehicles; new stations created by an admin have no operator account.
- Map, real payments and hardware control are intentionally out of scope. No automated test suite — the workflows were verified manually in the browser.
- The production bundle is ~730 kB (Recharts); acceptable for a local demo.
