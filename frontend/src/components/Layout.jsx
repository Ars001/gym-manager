// App shell: sidebar nav + header. Nav items respect the user's role and the
// tenant's feature flags, so a client with retail/POS disabled simply won't see
// that link — configuration, not code changes.

import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Layout({ children }) {
  const { user, tenant, logout, features } = useAuth();

  // Base nav available to all logged-in roles.
  const nav = [
    { to: '/', label: 'Dashboard', end: true },
    { to: '/schedule', label: 'Schedule' },
    { to: '/booking', label: 'Booking' },
  ];
  // Staff/admin-only screens.
  if (user?.role !== 'member') {
    nav.push({ to: '/members', label: 'Members' });
    nav.push({ to: '/plans', label: 'Plans' });
    nav.push({ to: '/check-in', label: 'Check-in' });
    nav.push({ to: '/billing', label: 'Billing' });
  }
  // Example of a feature-flag-gated nav item.
  if (features('retail_pos')) {
    nav.push({ to: '/retail', label: 'Retail / POS' });
  }
  // Admin-only settings (branding, feature toggles).
  if (user?.role === 'admin') {
    nav.push({ to: '/settings', label: 'Settings' });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">{tenant?.name || 'Gym Manager'}</div>
        <nav>
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="nav-link">
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button className="logout" onClick={logout}>Log out</button>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
