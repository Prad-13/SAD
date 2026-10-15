import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Car, ShieldCheck, Wrench } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Logo } from '../components/Layout';
import { Button, Card, DemoNote, Field, inputClass } from '../components/ui';
import { BATTERY_TYPES, type BatteryType, type Role } from '../types';
import { DEMO_PASSWORD, validateRegistration, type RegisterInput } from '../services/authService';

export const HOME: Record<Role, string> = { OWNER: '/owner', OPERATOR: '/operator', ADMIN: '/admin' };

const GROUPS = [
  { role: 'OWNER' as Role, title: 'EV Owner', desc: 'Find stations, reserve a charged battery, pay (simulated) and track swaps.', icon: Car },
  { role: 'OPERATOR' as Role, title: 'Station Operator', desc: 'Verify QR codes, record returned batteries and complete swaps.', icon: Wrench },
  { role: 'ADMIN' as Role, title: 'Administrator', desc: 'Manage stations, batteries, users and view reports.', icon: ShieldCheck },
];

const blank: RegisterInput = { name: '', email: '', phone: '', password: '', registrationNumber: '', vehicleModel: '', batteryType: 'VS-48V' };

export default function Login() {
  const { user, state, signIn, signUp, demoLogin } = useApp();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [form, setForm] = useState<RegisterInput>(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  if (user) return <Navigate to={HOME[user.role]} replace />;

  const submitLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const u = signIn(email, password);
    if (u) navigate(HOME[u.role]);
  };
  const submitRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateRegistration(state, form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const u = signUp(form);
    if (u) navigate(HOME[u.role]);
  };
  const set = (k: keyof RegisterInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value } as RegisterInput);

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <Logo light />
        <h1 className="mt-8 text-3xl font-extrabold text-white sm:text-4xl">EV Battery Swap Station Management</h1>
        <p className="mt-2 max-w-2xl text-slate-300">Sign in, register as an EV owner, or use a one-click demo account below.</p>
        <div className="mt-4 max-w-2xl"><DemoNote>Course project prototype. All stations, batteries, people, prices and payments are fictional sample data. Demo password for every seeded account: <b>{DEMO_PASSWORD}</b>.</DemoNote></div>

        <Card className="mt-8 max-w-xl p-6">
          <div className="mb-4 inline-flex rounded-lg bg-slate-100 p-1">
            {(['login', 'register'] as const).map((m) => (
              <button key={m} onClick={() => { setMode(m); setErrors({}); }}
                className={`rounded-md px-4 py-1.5 text-sm font-medium ${mode === m ? 'bg-white shadow-sm' : 'text-slate-600'}`}>{m === 'login' ? 'Log in' : 'Register (EV owner)'}</button>
            ))}
          </div>
          {mode === 'login' ? (
            <form onSubmit={submitLogin} className="space-y-4">
              <Field label="Email"><input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="aarav.sharma@demo.voltswap.in" autoComplete="username" /></Field>
              <Field label="Password"><input type="password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></Field>
              <Button type="submit" className="w-full">Log in</Button>
            </form>
          ) : (
            <form onSubmit={submitRegister} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Full name" error={errors.name}><input className={inputClass} value={form.name} onChange={set('name')} /></Field>
                <Field label="Mobile (10 digits)" error={errors.phone}><input className={inputClass} inputMode="numeric" maxLength={10} value={form.phone} onChange={set('phone')} /></Field>
                <Field label="Email" error={errors.email}><input className={inputClass} value={form.email} onChange={set('email')} /></Field>
                <Field label="Password (min 6)" error={errors.password}><input type="password" className={inputClass} value={form.password} onChange={set('password')} /></Field>
                <Field label="Vehicle registration" error={errors.registrationNumber}><input className={inputClass} placeholder="KA01 EV 1234" value={form.registrationNumber} onChange={set('registrationNumber')} /></Field>
                <Field label="Vehicle model" error={errors.vehicleModel}><input className={inputClass} value={form.vehicleModel} onChange={set('vehicleModel')} /></Field>
              </div>
              <Field label="Battery type" error={errors.batteryType}>
                <select className={inputClass} value={form.batteryType} onChange={(e) => setForm({ ...form, batteryType: e.target.value as BatteryType })}>
                  {BATTERY_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Button type="submit" className="w-full">Create account</Button>
            </form>
          )}
        </Card>

        <h2 className="mb-3 mt-10 text-sm font-semibold uppercase tracking-wide text-slate-400">One-click demo accounts</h2>
        <div className="grid gap-5 md:grid-cols-3">
          {GROUPS.map(({ role, title, desc, icon: Icon }) => (
            <Card key={role} className="flex flex-col p-5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-navy-900 text-volt-400"><Icon className="h-5 w-5" /></div>
              <h2 className="text-lg font-bold">{title}</h2>
              <p className="mb-4 mt-1 text-sm text-slate-500">{desc}</p>
              <div className="mt-auto space-y-2">
                {state.users.filter((u) => u.role === role && u.active).map((u) => (
                  <button key={u.id} onClick={() => { demoLogin(u.id); navigate(HOME[role]); }}
                    className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left text-sm transition-colors hover:border-blue-500 hover:bg-blue-50">
                    <span>
                      <span className="block font-medium text-slate-900">{u.name}</span>
                      <span className="block text-xs text-slate-500">{u.stationId ? state.stations.find((s) => s.id === u.stationId)?.name : u.email}</span>
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
