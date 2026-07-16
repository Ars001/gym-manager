// Route table + auth gate.
// WHY: keeps routing in one place. /guide is public (shareable, no login).
// Otherwise: unauthenticated users get Login/SignUp/Join; members get their
// portal; staff/admin get the full app — both inside the Layout shell.

import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import SignUp from './pages/SignUp.jsx';
import JoinGym from './pages/JoinGym.jsx';
import Guide from './pages/Guide.jsx';
import MyClasses from './pages/MyClasses.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Members from './pages/Members.jsx';
import MemberProfile from './pages/MemberProfile.jsx';
import Plans from './pages/Plans.jsx';
import Schedule from './pages/Schedule.jsx';
import Booking from './pages/Booking.jsx';
import CheckIn from './pages/CheckIn.jsx';
import Billing from './pages/Billing.jsx';
import Settings from './pages/Settings.jsx';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <div className="center">Loading…</div>;

  return (
    <Routes>
      {/* Public — no login required, shareable link */}
      <Route path="/guide" element={<Guide />} />

      {!user ? (
        <>
          <Route path="/signup" element={<SignUp />} />
          <Route path="/join" element={<JoinGym />} />
          <Route path="*" element={<Login />} />
        </>
      ) : user.role === 'member' ? (
        <Route element={<Layout />}>
          <Route path="/" element={<MyClasses />} />
          <Route path="/booking" element={<Booking />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      ) : (
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/members" element={<Members />} />
          <Route path="/members/:id" element={<MemberProfile />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/booking" element={<Booking />} />
          <Route path="/check-in" element={<CheckIn />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      )}
    </Routes>
  );
}
