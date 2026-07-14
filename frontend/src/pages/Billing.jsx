// Billing. Staff record a one-off charge for a member and see recent payments.
// Amount is entered in dollars and converted to integer cents before sending
// (the API and DB store money as cents). Recurring subscriptions come next.

import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext.jsx';
import { formatMoney } from '../config/branding';

export default function Billing() {
  const { tenant } = useAuth();
  const currency = tenant?.currency || 'USD';

  const [payments, setPayments] = useState([]);
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({ member_id: '', amount: '', description: '' });
  const [error, setError] = useState('');

  function load() {
    api.get('/payments').then((res) => setPayments(res.data)).catch(() => {});
  }
  useEffect(() => {
    load();
    api.get('/members').then((res) => setMembers(res.data)).catch(() => {});
  }, []);

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
      <h1>Billing</h1>

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
              <td>{p.status}</td>
              <td>{new Date(p.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
          {payments.length === 0 && (
            <tr><td colSpan="5" className="muted">No payments yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
