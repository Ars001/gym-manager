// Online booking. Staff pick which member they're booking for; a member-role
// user books themselves. For the chosen member we fetch their active bookings
// so each session shows Book or Cancel correctly and full sessions are blocked.

import { useEffect, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext.jsx';

export default function Booking() {
  const { user } = useAuth();
  const isMember = user?.role === 'member';

  const [sessions, setSessions] = useState([]);
  const [members, setMembers] = useState([]);
  const [memberId, setMemberId] = useState(isMember ? user.member_id : '');
  const [bookings, setBookings] = useState([]); // active bookings for the chosen member
  const [error, setError] = useState('');

  // Load sessions once; staff also get the member list to choose from.
  useEffect(() => {
    api.get('/sessions').then((res) => setSessions(res.data)).catch(() => {});
    if (!isMember) api.get('/members').then((res) => setMembers(res.data)).catch(() => {});
  }, [isMember]);

  // (Re)load the chosen member's bookings whenever the selection changes.
  const loadBookings = useCallback(() => {
    if (!memberId) { setBookings([]); return; }
    const params = isMember ? {} : { member_id: memberId };
    api.get('/bookings', { params }).then((res) => setBookings(res.data)).catch(() => {});
  }, [memberId, isMember]);
  useEffect(loadBookings, [loadBookings]);

  // Find this member's active booking for a session, if any.
  function activeBooking(sessionId) {
    return bookings.find((b) => b.session_id === sessionId && ['booked', 'attended'].includes(b.status));
  }

  async function book(sessionId) {
    setError('');
    try {
      await api.post('/bookings', { session_id: sessionId, member_id: memberId });
      loadBookings();
      refreshSessions();
    } catch (err) {
      setError(err.response?.data?.error || 'Booking failed');
    }
  }

  async function cancel(bookingId) {
    await api.post(`/bookings/${bookingId}/cancel`).catch(() => {});
    loadBookings();
    refreshSessions();
  }

  function refreshSessions() {
    api.get('/sessions').then((res) => setSessions(res.data)).catch(() => {});
  }

  return (
    <div>
      <h1>Book a class</h1>

      {!isMember && (
        <div className="card" style={{ marginBottom: 24, maxWidth: 400 }}>
          <label>Booking for member</label>
          <select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
            <option value="">— select a member —</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
            ))}
          </select>
        </div>
      )}

      {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}

      <div className="grid">
        {sessions.filter((s) => s.status === 'scheduled').map((s) => {
          const remaining = s.capacity - Number(s.booked_count || 0);
          const booking = activeBooking(s.id);
          return (
            <div className="card" key={s.id}>
              <b>{s.title}</b>
              <div className="muted">{new Date(s.starts_at).toLocaleString()}</div>
              <div className="muted">{remaining} spots left</div>
              {booking ? (
                <div style={{ marginTop: 12 }}>
                  {/* QR encodes the booking id; staff scan it at check-in. */}
                  <QRCodeSVG value={booking.id} size={96} />
                  <div>
                    <button className="btn" style={{ marginTop: 12, background: '#dc2626' }}
                      onClick={() => cancel(booking.id)}>Cancel booking</button>
                  </div>
                </div>
              ) : (
                <button className="btn" style={{ marginTop: 12 }}
                  disabled={!memberId || remaining <= 0}
                  onClick={() => book(s.id)}>
                  {remaining <= 0 ? 'Full' : 'Book'}
                </button>
              )}
            </div>
          );
        })}
        {sessions.filter((s) => s.status === 'scheduled').length === 0 &&
          <p className="muted">No sessions available.</p>}
      </div>
    </div>
  );
}
