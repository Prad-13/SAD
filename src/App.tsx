import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import type { ReactElement } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/Layout';
import { Toaster } from './components/ui';
import Login, { HOME } from './pages/Login';
import type { Role } from './types';
import OwnerDashboard from './pages/owner/OwnerDashboard';
import FindStations from './pages/owner/FindStations';
import StationDetails from './pages/owner/StationDetails';
import ReserveBattery from './pages/owner/ReserveBattery';
import ReservationDetail from './pages/owner/ReservationDetail';
import MyReservations from './pages/owner/MyReservations';
import OperatorOverview from './pages/operator/OperatorOverview';
import ManageSwaps from './pages/operator/ManageSwaps';
import OperatorInventory from './pages/operator/OperatorInventory';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminStations from './pages/admin/AdminStations';
import AdminBatteries from './pages/admin/AdminBatteries';
import AdminReports from './pages/admin/AdminReports';

/** Role gate: users can only reach the pages of their own role. */
function RequireRole({ role, children }: { role: Role; children: ReactElement }) {
  const { user } = useApp();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={HOME[user.role]} replace />;
  return children;
}

function RoleRedirect() {
  const { user } = useApp();
  return <Navigate to={user ? HOME[user.role] : '/login'} replace />;
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
            <Route path="/owner" element={<RequireRole role="OWNER"><OwnerDashboard /></RequireRole>} />
            <Route path="/owner/stations" element={<RequireRole role="OWNER"><FindStations /></RequireRole>} />
            <Route path="/owner/stations/:stationId" element={<RequireRole role="OWNER"><StationDetails /></RequireRole>} />
            <Route path="/owner/reserve" element={<RequireRole role="OWNER"><ReserveBattery /></RequireRole>} />
            <Route path="/owner/reservations" element={<RequireRole role="OWNER"><MyReservations /></RequireRole>} />
            <Route path="/owner/reservations/:reservationId" element={<RequireRole role="OWNER"><ReservationDetail /></RequireRole>} />

            <Route path="/operator" element={<RequireRole role="OPERATOR"><OperatorOverview /></RequireRole>} />
            <Route path="/operator/swaps" element={<RequireRole role="OPERATOR"><ManageSwaps /></RequireRole>} />
            <Route path="/operator/inventory" element={<RequireRole role="OPERATOR"><OperatorInventory /></RequireRole>} />

            <Route path="/admin" element={<RequireRole role="ADMIN"><AdminDashboard /></RequireRole>} />
            <Route path="/admin/stations" element={<RequireRole role="ADMIN"><AdminStations /></RequireRole>} />
            <Route path="/admin/batteries" element={<RequireRole role="ADMIN"><AdminBatteries /></RequireRole>} />
            <Route path="/admin/reports" element={<RequireRole role="ADMIN"><AdminReports /></RequireRole>} />
          </Route>
          <Route path="*" element={<RoleRedirect />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </AppProvider>
  );
}
