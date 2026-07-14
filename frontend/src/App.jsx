// Route table + auth gate.
// WHY: keeps routing in one place. Unauthenticated users see only Login; once
// logged in they get the app shell (Layout) with the MVP pages as children.

import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Members from './pages/Members.jsx';
import Plans from './pages/Plans.jsx';
import Schedule from './pages/Schedule.jsx';
import Booking from './pages/Booking.jsx';
import CheckIn from './pages/CheckIn.jsx';
import Billing from './pages/Billing.jsx';
import Settings from './pages/Settings.jsx';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <div className="center">Loading…</div>;
  if (!user) return (
    <Routes>
      <Route path="*" element={<Login />} />
    </Routes>
  );

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/members" element={<Members />} />
        <Route path="/plans" element={<Plans />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/booking" element={<Booking />} />
        <Route path="/check-in" element={<CheckIn />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
