// Reporting dashboard. Pulls summary metrics from /api/reports/summary and shows
// premium stat cards. When the gym has no data yet, it shows a friendly
// "getting started" checklist so a new user knows exactly what to do first.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext.jsx';
import { formatMoney } from '../config/branding';
import { IconUsers, IconDollar, IconCheckSquare, IconTrend, IconCheck } from '../components/icons.jsx';

// One stat tile.
function Stat({ icon: Icon, label, value, accent }) {
  return (
    <div className="card stat-card">
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        <span className="stat-ic"><Icon /></span>
      </div>
      <div className={`stat${accent ? ' accent' : ''}`}>{value}</div>
    </div>
  );
}

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

  const steps = [
    ['Create a membership plan', '/plans'],
    ['Add a member and put them on that plan', '/members'],
    ['Schedule a session (a class or slot)', '/schedule'],
    ['Book the member into that session', '/booking'],
    ['Check them in when they arrive', '/check-in'],
  ];

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <div className="subtitle">Overview of {tenant?.name || 'your gym'}</div>
        </div>
      </div>

      {isEmpty && (
        <div className="card" style={{ marginBottom: 22 }}>
          <h3>👋 Welcome! Let’s set up your gym</h3>
          <p className="muted" style={{ marginTop: 0 }}>Follow these steps in order — it takes about a minute:</p>
          <ol style={{ margin: 0, paddingLeft: 18, lineHeight: 2 }}>
            {steps.map(([text, to]) => (
              <li key={to}><Link to={to}>{text}</Link></li>
            ))}
          </ol>
          <p className="muted" style={{ marginTop: 12 }}>
            Prefer it pre-filled? Double-click <b>load-demo-data.bat</b> in the project folder, then refresh.
          </p>
        </div>
      )}

      <div className="grid">
        <Stat icon={IconUsers} label="Active members" value={data.members.active_members} accent />
        <Stat icon={IconUsers} label="Churned members" value={data.members.churned_members} />
        <Stat icon={IconDollar} label="Revenue (30 days)" value={formatMoney(data.revenue.revenue_30d_cents, currency)} />
        <Stat icon={IconTrend} label="Revenue (all time)" value={formatMoney(data.revenue.revenue_all_cents, currency)} />
        <Stat icon={IconCheckSquare} label="Check-ins (30 days)" value={data.attendance.checkins_30d} />
        <Stat icon={IconCheck} label="Total members" value={data.members.total_members} />
      </div>
    </div>
  );
}
