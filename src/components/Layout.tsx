import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BatteryCharging, ClipboardList, History, LayoutDashboard, LogOut, MapPin, Menu, RefreshCw, Repeat, Settings2, Warehouse, X,
  FileBarChart, Zap, Boxes, type LucideIcon,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ConfirmDialog, DemoNote } from './ui';
import { cn, humanize } from '../utils/format';
import type { Role } from '../types';

export function Logo({ light }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="rounded-lg bg-volt-500 p-1.5 text-navy-950"><Zap className="h-5 w-5" fill="currentColor" /></div>
      <span className={cn('text-xl font-extrabold tracking-tight', light ? 'text-white' : 'text-slate-900')}>
        Volt<span className="text-volt-400">Swap</span>
      </span>
    </div>
  );
}

const NAV: Record<Role, { to: string; label: string; icon: LucideIcon; end?: boolean }[]> = {
  OWNER: [
    { to: '/owner', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/owner/stations', label: 'Find Stations', icon: MapPin },
    { to: '/owner/reservations', label: 'My Reservations', icon: History },
  ],
  OPERATOR: [
    { to: '/operator', label: 'Station Overview', icon: LayoutDashboard, end: true },
    { to: '/operator/swaps', label: 'Manage Swaps', icon: Repeat },
    { to: '/operator/inventory', label: 'Battery Inventory', icon: BatteryCharging },
  ],
  ADMIN: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/stations', label: 'Manage Stations', icon: Warehouse },
    { to: '/admin/batteries', label: 'Manage Batteries', icon: Boxes },
    { to: '/admin/reports', label: 'Reservations & Reports', icon: FileBarChart },
  ],
};

export default function Layout() {
  const { user, logout, resetDemo, state } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  if (!user) return null;
  const station = user.stationId ? state.stations.find((s) => s.id === user.stationId) : undefined;

  const sidebar = (
    <div className="flex h-full flex-col bg-navy-900 text-slate-300">
      <div className="flex items-center justify-between px-5 py-5">
        <Logo light />
        <button className="text-slate-400 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV[user.role].map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
            className={({ isActive }) => cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive ? 'bg-navy-700 text-white' : 'hover:bg-navy-800 hover:text-white')}>
            <Icon className="h-4.5 w-4.5" /> {label}
          </NavLink>
        ))}
      </nav>
      <div className="space-y-2 border-t border-navy-700 p-4">
        <div className="rounded-lg bg-navy-800 p-3">
          <p className="truncate text-sm font-semibold text-white">{user.name}</p>
          <p className="text-xs text-volt-400">{humanize(user.role)}{station ? ` · ${station.name}` : ''}</p>
        </div>
        <button onClick={() => setConfirmReset(true)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-navy-800 hover:text-white">
          <RefreshCw className="h-4 w-4" /> Reset demo data
        </button>
        <button onClick={() => { logout(); navigate('/login'); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-navy-800 hover:text-white">
          <LogOut className="h-4 w-4" /> Switch role / log out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-64 shrink-0 lg:block"><div className="fixed inset-y-0 w-64">{sidebar}</div></aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64">{sidebar}</div>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:px-8">
          <button className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <div className="lg:hidden"><Logo /></div>
          <div className="ml-auto flex items-center gap-2 text-xs text-slate-500"><Settings2 className="h-4 w-4" /> Prototype · all data is sample data</div>
        </header>
        <main className="mx-auto max-w-7xl p-4 lg:p-8"><Outlet /></main>
      </div>
      <ConfirmDialog open={confirmReset} danger title="Reset demo data?"
        message={<>All reservations, swaps, payments and inventory changes will be erased and the original sample data restored. <DemoNote>This cannot be undone.</DemoNote></>}
        confirmLabel="Reset everything" onCancel={() => setConfirmReset(false)}
        onConfirm={() => { resetDemo(); setConfirmReset(false); }} />
    </div>
  );
}

export { ClipboardList };
