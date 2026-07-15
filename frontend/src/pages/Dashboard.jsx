// Reporting dashboard. Pulls summary metrics from /api/reports/summary and shows
// premium stat cards. When the gym has no data yet, it shows a friendly
// "getting started" checklist so a new user knows exactly what to do first.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext.jsx';
import { formatMoney } from '../config/branding';
import { IconUsers, IconDollar, IconCheckSquare, IconTrend, IconCheck } from '../components/icons.jsx';
import BarChart from '../components/BarChart.jsx';

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
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/reports/summary')
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load report'));
    api.get('/reports/insights').then((res) => setInsights(res.data)).catch(() => {});
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

      {insights && !isEmpty && (
        <>
          <div className="page-head" style={{ marginTop: 30 }}>
            <div><h1 style={{ fontSize: '1.2rem' }}>Insights</h1></div>
          </div>

          <div className="grid" style={{ marginBottom: 8 }}>
            <Stat icon={IconDollar} label="Monthly recurring revenue (MRR)"
              value={formatMoney(insights.mrr_cents, currency)} accent />
          </div>

          <div className="grid">
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Revenue — last 6 months</h3>
              <BarChart data={insights.revenue_by_month.map((r) => ({ label: r.label, value: Number(r.cents) }))}
                format={(v) => formatMoney(v, currency)} />
            </div>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>New members — last 8 weeks</h3>
              <BarChart data={insights.new_members_by_week.map((r) => ({ label: r.label, value: r.count }))} />
            </div>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Check-ins — last 8 weeks</h3>
              <BarChart data={insights.attendance_by_week.map((r) => ({ label: r.label, value: r.count }))} />
            </div>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Active members by plan</h3>
              {insights.members_by_plan.length ? (
                <table>
                  <tbody>
                    {insights.members_by_plan.map((p, i) => (
                      <tr key={i}><td>{p.plan}</td><td style={{ textAlign: 'right' }}><b>{p.count}</b></td></tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="muted">No active members.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
