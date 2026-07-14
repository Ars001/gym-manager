// Billing. Placeholder that lists recent payments. Recurring membership billing
// and one-off charges go through Stripe via /api/payments (see backend).

import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext.jsx';
import { formatMoney } from '../config/branding';

export default function Billing() {
  const { tenant } = useAuth();
  const [payments, setPayments] = useState([]);
  const currency = tenant?.currency || 'USD';

  useEffect(() => {
    api.get('/payments').then((res) => setPayments(res.data)).catch(() => {});
  }, []);

  return (
    <div>
      <h1>Billing</h1>
      <p className="muted">Recent payments. (Charge / subscription forms — coming next.)</p>
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
