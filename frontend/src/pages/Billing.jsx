// Billing. Staff record a one-off charge for a member and see recent payments.
// Amount is entered in dollars and converted to integer cents before sending
// (the API and DB store money as cents). Recurring subscriptions come next.

import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext.jsx';
import { formatMoney } from '../config/branding';
import StatusBadge from '../components/StatusBadge.jsx';
import { downloadCsv } from '../utils/csv.js';

export default function Billing() {
  const { tenant } = useAuth();
  const currency = tenant?.currency || 'USD';

  const [payments, setPayments] = useState([]);
  const [members, setMembers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState({ member_id: '', amount: '', description: '' });
  const [sub, setSub] = useState({ member_id: '', plan_id: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function load() {
    api.get('/payments').then((res) => setPayments(res.data)).catch(() => {});
  }
  useEffect(() => {
    load();
    api.get('/members').then((res) => setMembers(res.data)).catch(() => {});
    // Only recurring plans can be subscribed to.
    api.get('/plans').then((res) => setPlans(res.data.filter((p) => p.active && p.billing_interval !== 'one_off'))).catch(() => {});
  }, []);

  async function subscribe(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    if (!sub.member_id || !sub.plan_id) {
      setError('Pick a member and a plan');
      return;
    }
    try {
      const res = await api.post('/payments/subscribe', sub);
      setSub({ member_id: '', plan_id: '' });
      // With Stripe on, the first payment must be confirmed with this secret on a
      // card form (Stripe Elements) — noted here for the next build step.
      setNotice(res.data.clientSecret
        ? 'Subscription created. First payment needs card confirmation (Stripe Elements — next step).'
        : 'Subscription recorded and membership activated.');
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Subscribe failed');
    }
  }

  async function charge(e) {
    e.preventDefault();
    setError('');
    const amountCents = Math.round(parseFloat(form.amount) * 100);
    if (!amountCents || amountCents <= 0) {
      setError('Enter a valid amount');
      return;
    }
    try {
      await api.post('/payments/charge', {
        member_id: form.member_id || null,
        amount_cents: amountCents,
        currency,
        description: form.description || null,
      });
      setForm({ member_id: '', amount: '', description: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Charge failed');
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Billing</h1>
          <div className="subtitle">Subscribe members to plans and record payments</div>
        </div>
      </div>

      {notice && <div className="card" style={{ marginBottom: 16, borderColor: 'var(--color-primary)' }}>{notice}</div>}

      <form className="card" style={{ marginBottom: 24 }} onSubmit={subscribe}>
        <h3 style={{ marginTop: 0 }}>Subscribe a member to a plan</h3>
        <div className="grid">
          <div className="form-row">
            <label>Member</label>
            <select value={sub.member_id} onChange={(e) => setSub({ ...sub, member_id: e.target.value })}>
              <option value="">— select —</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
            </select>
          </div>
          <div className="form-row">
            <label>Plan</label>
            <select value={sub.plan_id} onChange={(e) => setSub({ ...sub, plan_id: e.target.value })}>
              <option value="">— select —</option>
              {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <button className="btn">Subscribe</button>
      </form>

      <form className="card" style={{ marginBottom: 24 }} onSubmit={charge}>
        <h3 style={{ marginTop: 0 }}>Record a one-off charge</h3>
        <div className="grid">
          <div className="form-row">
            <label>Member (optional)</label>
            <select value={form.member_id} onChange={(e) => setForm({ ...form, member_id: e.target.value })}>
              <option value="">— none —</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>Amount ({currency})</label>
            <input type="number" step="0.01" min="0" value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Description</label>
            <input value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        <button className="btn">Charge</button>
        {error && <div className="error">{error}</div>}
        <p className="muted" style={{ marginTop: 12 }}>
          Without a Stripe key configured, charges are recorded as succeeded for demo/testing.
        </p>
      </form>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 12 }}>
        <h3 style={{ margin: 0 }}>Payments</h3>
        <button type="button" className="btn btn-sm btn-ghost" disabled={!payments.length}
          onClick={() => downloadCsv('payments.csv', payments.map((p) => ({
            member: p.first_name ? `${p.first_name} ${p.last_name}` : '',
            amount: (p.amount_cents / 100).toFixed(2), currency: p.currency,
            type: p.type, status: p.status, date: new Date(p.created_at).toISOString().slice(0, 10),
          })))}>Export CSV</button>
      </div>
      <div className="table-wrap scroll">
        <table>
          <thead>
            <tr><th>Member</th><th>Amount</th><th>Type</th><th>Status</th><th>Date</th></tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td>{p.first_name ? `${p.first_name} ${p.last_name}` : '—'}</td>
                <td>{formatMoney(p.amount_cents, p.currency || currency)}</td>
                <td>{p.type}</td>
                <td><StatusBadge status={p.status} /></td>
                <td>{new Date(p.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr><td colSpan="5" className="muted">No payments yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
