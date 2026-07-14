// Membership plans management. Create recurring or one-off plans and toggle
// them active/inactive. When Stripe is configured, creating a recurring plan
// also creates the backing Stripe Price (handled server-side).

import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext.jsx';
import { formatMoney } from '../config/branding';

const EMPTY = { name: '', amount: '', billing_interval: 'month' };

export default function Plans() {
  const { tenant } = useAuth();
  const currency = tenant?.currency || 'USD';
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  function load() {
    api.get('/plans').then((res) => setPlans(res.data)).catch(() => {});
  }
  useEffect(load, []);

  async function createPlan(e) {
    e.preventDefault();
    setError('');
    const amountCents = Math.round(parseFloat(form.amount) * 100);
    if (!form.name || !amountCents || amountCents < 0) {
      setError('Enter a name and a valid price');
      return;
    }
    try {
      await api.post('/plans', {
        name: form.name,
        price_cents: amountCents,
        currency,
        billing_interval: form.billing_interval,
      });
      setForm(EMPTY);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create plan');
    }
  }

  async function toggleActive(plan) {
    await api.put(`/plans/${plan.id}`, { active: !plan.active }).catch(() => {});
    load();
  }

  return (
    <div>
      <h1>Membership plans</h1>

      <form className="card" style={{ marginBottom: 24 }} onSubmit={createPlan}>
        <h3 style={{ marginTop: 0 }}>New plan</h3>
        <div className="grid">
          <div className="form-row">
            <label>Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Price ({currency})</label>
            <input type="number" step="0.01" min="0" value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Billing</label>
            <select value={form.billing_interval}
              onChange={(e) => setForm({ ...form, billing_interval: e.target.value })}>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
              <option value="one_off">One-off</option>
            </select>
          </div>
        </div>
        <button className="btn">Create plan</button>
        {error && <div className="error">{error}</div>}
      </form>

      <table>
        <thead>
          <tr><th>Name</th><th>Price</th><th>Billing</th><th>Active</th><th></th></tr>
        </thead>
        <tbody>
          {plans.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{formatMoney(p.price_cents, p.currency || currency)}</td>
              <td>{p.billing_interval}</td>
              <td>{p.active ? 'Yes' : 'No'}</td>
              <td>
                <button className="btn" style={{ background: p.active ? '#dc2626' : undefined }}
                  onClick={() => toggleActive(p)}>{p.active ? 'Deactivate' : 'Activate'}</button>
              </td>
            </tr>
          ))}
          {plans.length === 0 && <tr><td colSpan="5" className="muted">No plans yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
