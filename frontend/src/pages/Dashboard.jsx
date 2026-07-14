// Reporting dashboard. Pulls the summary metrics from /api/reports/summary and
// shows headline numbers: active vs churned members, revenue, attendance.

import { useEffect, useState } from 'react';
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

  return (
    <div>
      <h1>Dashboard</h1>
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
          <div className="muted">Check-ins (30 days)</div>
          <div className="stat">{data.attendance.checkins_30d}</div>
        </div>
      </div>
    </div>
  );
}
