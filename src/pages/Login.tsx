import { Navigate, useNavigate } from 'react-router-dom';
import { Car, ShieldCheck, Wrench } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Logo } from '../components/Layout';
import { Card, DemoNote } from '../components/ui';
import type { Role } from '../types';

export const HOME: Record<Role, string> = { OWNER: '/owner', OPERATOR: '/operator', ADMIN: '/admin' };

const GROUPS = [
  { role: 'OWNER' as Role, title: 'EV Owner', desc: 'Find stations, reserve a charged battery, pay (simulated) and track swaps.', icon: Car },
  { role: 'OPERATOR' as Role, title: 'Station Operator', desc: 'Verify reservations, record returned batteries and complete swaps.', icon: Wrench },
  { role: 'ADMIN' as Role, title: 'Administrator', desc: 'Manage stations, batteries, reservations and view reports.', icon: ShieldCheck },
];

export default function Login() {
  const { user, state, login } = useApp();
  const navigate = useNavigate();
  if (user) return <Navigate to={HOME[user.role]} replace />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <Logo light />
        <h1 className="mt-8 text-3xl font-extrabold text-white sm:text-4xl">EV Battery Swap Station Management</h1>
        <p className="mt-2 max-w-2xl text-slate-300">
          Choose a demo account to explore VoltSwap. There is no real login — the selected role decides which pages and actions you get.
        </p>
        <div className="mt-4 max-w-2xl"><DemoNote>Course project prototype. All stations, batteries, people, prices and payments are fictional sample data. Payments are simulated.</DemoNote></div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {GROUPS.map(({ role, title, desc, icon: Icon }) => (
            <Card key={role} className="flex flex-col p-5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-navy-900 text-volt-400"><Icon className="h-5 w-5" /></div>
              <h2 className="text-lg font-bold">{title}</h2>
              <p className="mb-4 mt-1 text-sm text-slate-500">{desc}</p>
              <div className="mt-auto space-y-2">
                {state.users.filter((u) => u.role === role).map((u) => (
                  <button key={u.id} onClick={() => { login(u.id); navigate(HOME[role]); }}
                    className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left text-sm transition-colors hover:border-blue-500 hover:bg-blue-50">
                    <span>
                      <span className="block font-medium text-slate-900">{u.name}</span>
                      <span className="block text-xs text-slate-500">
                        {u.stationId ? state.stations.find((s) => s.id === u.stationId)?.name : u.email}
                      </span>
                    </span>
                    <span className="text-xs font-semibold text-blue-600">Log in</span>
                  </button>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
