// Member profile: full details for one member plus their booking and payment
// history. Reached by clicking a member's name on the Members page.

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext.jsx';
import { formatMoney } from '../config/branding';
import StatusBadge from '../components/StatusBadge.jsx';

export default function MemberProfile() {
  const { id } = useParams();
  const { tenant } = useAuth();
  const currency = tenant?.currency || 'USD';
  const [member, setMember] = useState(null);
  const [plans, setPlans] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/members/${id}`).then((r) => setMember(r.data)).catch((e) => setError(e.response?.data?.error || 'Member not found'));
    api.get('/plans').then((r) => setPlans(r.data)).catch(() => {});
    api.get('/bookings', { params: { member_id: id } }).then((r) => setBookings(r.data)).catch(() => {});
    api.get('/payments', { params: { member_id: id } }).then((r) => setPayments(r.data)).catch(() => {});
  }, [id]);

  if (error) return <div className="error">{error}</div>;
  if (!member) return <p className="muted">Loading…</p>;

  const planName = plans.find((p) => p.id === member.membership_plan_id)?.name || '—';

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>{member.first_name} {member.last_name}</h1>
          <div className="subtitle"><Link to="/members">← Back to members</Link></div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 22 }}>
        <div className="grid">
          <div><div className="muted">Status</div><StatusBadge status={member.status} /></div>
          <div><div className="muted">Plan</div><b>{planName}</b></div>
          <div><div className="muted">Email</div>{member.email || '—'}</div>
          <div><div className="muted">Phone</div>{member.phone || '—'}</div>
          <div><div className="muted">Joined</div>{new Date(member.joined_at).toLocaleDateString()}</div>
        </div>
      </div>

      <h3>Booking history ({bookings.length})</h3>
      <div className="table-wrap scroll" style={{ marginBottom: 22 }}>
        <table>
          <thead><tr><th>Class</th><th>When</th><th>Status</th></tr></thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id}>
                <td>{b.session_title}</td>
                <td>{b.starts_at ? new Date(b.starts_at).toLocaleString() : '—'}</td>
                <td><StatusBadge status={b.status} /></td>
              </tr>
            ))}
            {bookings.length === 0 && <tr><td colSpan="3" className="muted">No bookings yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <h3>Payment history ({payments.length})</h3>
      <div className="table-wrap scroll">
        <table>
          <thead><tr><th>Amount</th><th>Type</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td>{formatMoney(p.amount_cents, p.currency || currency)}</td>
                <td>{p.type}</td>
                <td><StatusBadge status={p.status} /></td>
                <td>{new Date(p.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {payments.length === 0 && <tr><td colSpan="4" className="muted">No payments yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
