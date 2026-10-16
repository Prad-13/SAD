# VoltSwap — EV Battery Swap Station Management (prototype)

React + Vite + TypeScript + Tailwind v4 + React Router + Lucide + Recharts + `qrcode`. No backend: all state lives in `localStorage`. **All data is fictional sample data; payments, email and SMS are simulated.**

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build
```

Demo password for every seeded account: `demo123` (or use the one-click demo buttons). Owners can also **register** (creates the account and a vehicle).

## Demo script

1. Log in as **Arjun** (owner, VS-48V) → *Find Stations* (nearest-first, banner shows the nearest station with a compatible charged battery) → *Reserve Battery* → pick BAT-4801 and a slot.
2. Pay (UPI `arjun@upi`): choose **Simulate failed payment** first → retry → success. The reservation becomes *Confirmed*, a **QR code** appears, and Notifications show in-app + simulated email + SMS.
3. *Switch role* → **Prasad** (operator, Hitech City) → *Manage Swaps* → *Simulate scan* (or paste the QR text; a wrong QR is rejected) → pick the returned battery → tick “handed over” → *Confirm swap completed*. Re-scanning the same QR is rejected.
4. *Battery Inventory*: the returned battery is **Depleted** → *Send to charging* → *Charging complete* (Fully charged).
5. Back as Arjun: *My Reservations* (swap receipt), *Transaction History*, *Notifications*. As **Venkat** (admin): dashboard, *Manage Users*, *Reports* (incl. the simulated notification outbox, CSV export).
6. Expiry: an unpaid reservation expires after 15 min (confirmed ones 60 min after their slot) and the battery returns to Fully charged. Sidebar *Reset demo data* restores the seed.

## How the code maps to the UML diagrams

| Diagram element | Code |
|---|---|
| Register/Login, AuthService | `services/authService.ts`, `pages/Login.tsx` |
| Find nearest station, Search Station Service | `services/stationSearchService.ts`, `pages/owner/FindStations.tsx` |
| Check battery availability, Battery Service | `services/batteryService.ts` (`isReservable`, `reservableBatteries`) |
| Reserve battery, Reservation Service | `services/reservationService.ts` |
| Make payment, Payment Gateway (simulated) | `services/paymentService.ts`, `components/PaymentModal.tsx` |
| Notifications, Notification + Email/SMS service (simulated) | `services/notificationService.ts`, `pages/owner/Notifications.tsx`, admin Reports → Notifications |
| Display / verify QR code | `components/QrCode.tsx`, `services/swapService.ts` (`verifyReservation`) |
| Perform swap, update inventory, generate receipt | `services/swapService.ts` (`completeSwap`), `components/SwapReceipt.tsx` |
| View transaction history | `pages/owner/Transactions.tsx` |
| Manage stations and users | `pages/admin/AdminStations.tsx`, `AdminUsers.tsx` |
| Database component | `services/storage.ts` (LocalStorage) |
| Class diagram (User, Vehicle, Station, Battery, Reservation, Payment) | `types/index.ts` (+ SwapSession, Notification) |

### Battery state chart → `BatteryStatus`
`CREATED → IN_INVENTORY` (install at station) `→ CHARGING` (send to charging) `→ FULLY_CHARGED` (charging complete) `→ RESERVED` (reserve) `→ IN_USE` (swap) `→ DEPLETED` (battery returned) `→ CHARGING`. `RESERVED → FULLY_CHARGED` on cancel/expire. Manual transitions are limited to `BATTERY_TRANSITIONS` in `services/constants.ts`; RESERVED / IN_USE are only set by the reservation and swap workflows. In the code, the “swap start” transition (RESERVED → IN_USE) happens when the operator confirms the completed hand-over.

## Folder structure

```
src/types            entities + AppState
src/data/seed.ts     fictional seed data
src/services         business logic: pure (state, input) => { state, result }, throws on rule violation
src/context          AppContext: run(serviceFn) commits, persists, toasts errors; expiry timer; session
src/components       reusable UI (ui.tsx, Layout, PaymentModal, QrCode, SwapReceipt, ...)
src/pages            owner/, operator/, admin/ screens (role-guarded in App.tsx)
```

## Key business rules

- Reservable battery = `FULLY_CHARGED` ∧ charge ≥ 90 ∧ health ≥ 70 ∧ type matches vehicle ∧ no active reservation. Reserving locks it (`RESERVED`) → no double booking; one active reservation per vehicle; slot capacity per station.
- Reservation: `PENDING_PAYMENT → CONFIRMED → COMPLETED`, or `CANCELLED` / `EXPIRED`. Cancel and expire release the battery and refund a successful payment (simulated).
- Payments: failure is stored as FAILED, reservation stays pending (retry or cancel); a paid reservation rejects further attempts (no duplicate charge); cash is settled at swap completion.
- Swap: QR must match the reservation; only CONFIRMED reservations at this station with a still-RESERVED, compatible battery verify. Completion is one atomic update (issued → IN_USE, returned → DEPLETED, reservation/session COMPLETED, receipt, notifications) and can't run twice.
- Dashboard numbers are derived from state on every render.

## Limitations (honest list)

- **Deployment diagram:** the prototype is a single client-side app. There is no application server, MySQL database, real payment API or real email/SMS provider; those boxes are represented by the service modules, LocalStorage and the simulated outbox.
- Passwords are stored as a toy checksum for demo purposes (`authService.ts`) — never do this in production.
- The QR is generated and verified by pasting/“Simulate scan”; there is no camera scanning.
- The state chart’s extra Reserved → Charging arrow is not implemented.
- Data is per-browser; no automated test suite (workflows were verified manually in the browser).
