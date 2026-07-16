// App shell: branded sidebar (with icons) + responsive top bar on mobile.
// Nav items respect the user's role and the tenant's feature flags, so a client
// with retail/POS disabled simply won't see that link — configuration, not code.

import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { initials } from '../config/branding';
import TrialBanner from './TrialBanner.jsx';
import {
  IconGrid, IconCalendar, IconTicket, IconUsers, IconTag,
  IconCheckSquare, IconCard, IconSettings, IconLogout, IconMenu, IconStore,
} from './icons.jsx';

// Icon lookup so nav data stays declarative.
const ICONS = {
  grid: IconGrid, calendar: IconCalendar, ticket: IconTicket, users: IconUsers,
  tag: IconTag, check: IconCheckSquare, card: IconCard, settings: IconSettings, store: IconStore,
};

export default function Layout({ children }) {
  const { user, tenant, logout, features } = useAuth();
  const [open, setOpen] = useState(false); // mobile drawer

  // Nav grouped into sections. Each entry: { to, label, icon, end }.
  // Members get a simple portal nav; staff/admin get the full app.
  const groups = user?.role === 'member'
    ? [{ title: null, items: [
        { to: '/', label: 'My classes', icon: 'check', end: true },
        { to: '/booking', label: 'Book a class', icon: 'ticket' },
      ] }]
    : [{ title: null, items: [
        { to: '/', label: 'Dashboard', icon: 'grid', end: true },
        { to: '/schedule', label: 'Schedule', icon: 'calendar' },
        { to: '/booking', label: 'Booking', icon: 'ticket' },
      ] }];

  const manage = [];
  if (user?.role !== 'member') {
    manage.push(
      { to: '/members', label: 'Members', icon: 'users' },
      { to: '/plans', label: 'Plans', icon: 'tag' },
      { to: '/check-in', label: 'Check-in', icon: 'check' },
      { to: '/billing', label: 'Billing', icon: 'card' },
    );
  }
  if (features('retail_pos')) manage.push({ to: '/retail', label: 'Retail / POS', icon: 'store' });
  if (manage.length) groups.push({ title: 'Manage', items: manage });

  if (user?.role === 'admin') {
    groups.push({ title: 'Admin', items: [{ to: '/settings', label: 'Settings', icon: 'settings' }] });
  }

  const gymName = tenant?.name || 'Gym Manager';

  return (
    <div className="app-shell">
      {/* Mobile top bar */}
      <header className="topbar">
        <button className="hamburger" onClick={() => setOpen(true)} aria-label="Open menu"><IconMenu /></button>
        <span className="brand-name">{gymName}</span>
      </header>

      {open && <div className="backdrop" onClick={() => setOpen(false)} />}

      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="brand">
          <div className="brand-logo">{initials(gymName)}</div>
          <div>
            <div className="brand-name">{gymName}</div>
            <div className="brand-sub">Studio management</div>
          </div>
        </div>

        <nav onClick={() => setOpen(false)}>
          {groups.map((g, gi) => (
            <div key={gi}>
              {g.title && <div className="nav-section">{g.title}</div>}
              {g.items.map((item) => {
                const Icon = ICONS[item.icon] || IconGrid;
                return (
                  <NavLink key={item.to} to={item.to} end={item.end} className="nav-link">
                    <Icon /> {item.label}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          {user?.role !== 'member' && (
            <div className="sub-cta">
              <div className="sub-cta-title">Want a subscription?</div>
              <div className="sub-cta-sub">Contact Arslan:</div>
              <a className="sub-cta-link" href="https://wa.me/12135825569" target="_blank" rel="noreferrer">
                WhatsApp: +1 (213) 582-5569
              </a>
              <a className="sub-cta-link" href="mailto:Muhammadarslan3@outlook.com">
                Muhammadarslan3@outlook.com
              </a>
            </div>
          )}
          <div className="user-chip">
            <div className="avatar">{initials(user?.email || 'U')}</div>
            <div>
              <div className="user-name">{user?.email?.split('@')[0] || 'User'}</div>
              <div className="user-role">{user?.role || ''}</div>
            </div>
          </div>
          <button className="logout" onClick={logout}><IconLogout /> Log out</button>
        </div>
      </aside>

      <div className="app-main">
        <main className="content">
          <TrialBanner />
          {children}
        </main>
      </div>
    </div>
  );
}
