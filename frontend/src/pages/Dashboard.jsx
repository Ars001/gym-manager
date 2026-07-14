// Reporting dashboard. Pulls summary metrics from /api/reports/summary and shows
// headline numbers. When the gym has no data yet, it shows a simple, friendly
// "getting started" checklist so a new user knows exactly what to do first.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext.jsx';
import { formatMoney } from '../config/branding';

export default function Dashboard() {
  const { tenant } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/reports/summary')
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load report'));
  }, []);

  if (error) return <div className="error">{error}</div>;
  if (!data) return <p className="muted">Loading dashboard…</p>;

  const currency = tenant?.currency || 'USD';
  const isEmpty = Number(data.members.total_members) === 0;

  return (
    <div>
      <h1>Dashboard</h1>

      {/* First-time guidance: shown until the gym has at least one member. */}
      {isEmpty && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginTop: 0 }}>👋 Welcome! Let’s set up your gym</h3>
          <p className="muted">Follow these steps in order — it takes about a minute:</p>
          <ol style={{ lineHeight: 1.9, margin: 0 }}>
            <li><Link to="/plans">Create a membership plan</Link> (e.g. Monthly)</li>
            <li><Link to="/members">Add a member</Link> and put them on that plan</li>
            <li><Link to="/schedule">Schedule a session</Link> (a class or slot)</li>
            <li><Link to="/booking">Book the member</Link> into that session</li>
            <li><Link to="/check-in">Check them in</Link> when they arrive</li>
          </ol>
          <p className="muted" style={{ marginTop: 12 }}>
            Want it pre-filled instead? Double-click <b>load-demo-data.bat</b> in the
            project folder, then refresh this page.
          </p>
        </div>
      )}

      <div className="grid">
        <div className="card">
          <div className="muted">Active members</div>
          <div className="stat">{data.members.active_members}</div>
        </div>
        <div className="card">
          <div className="muted">Churned members</div>
          <div className="stat">{data.members.churned_members}</div>
        </div>
        <div className="card">
          <div className="muted">Revenue (30 days)</div>
          <div className="stat">{formatMoney(data.revenue.revenue_30d_cents, currency)}</div>
        </div>
        <div className="card">
          <div className="muted">Revenue (all time)</div>
          <div className="stat">{formatMoney(data.revenue.revenue_all_cents, currency)}</div>
        </div>
        <div className="card">
          <div className="muted">Check-ins (30 days)</div>
          <div className="stat">{data.attendance.checkins_30d}</div>
        </div>
        <div className="card">
          <div className="muted">Total members</div>
          <div className="stat">{data.members.total_members}</div>
        </div>
      </div>
    </div>
  );
}
