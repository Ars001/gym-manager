// Online booking. Staff pick which member they're booking for; a member-role
// user books themselves. For the chosen member we fetch their active bookings
// so each session shows Book or Cancel correctly and full sessions are blocked.

import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
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
    if (!window.confirm('Cancel this booking?')) return;
    await api.post(`/bookings/${bookingId}/cancel`).catch(() => {});
    loadBookings();
    refreshSessions();
  }

  function refreshSessions() {
    api.get('/sessions').then((res) => setSessions(res.data)).catch(() => {});
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Book a class</h1>
          <div className="subtitle">Reserve a spot in an upcoming class and get a check-in QR code</div>
        </div>
      </div>

      {/* Step 1 hint for staff: pick who you're booking for. */}
      {!isMember && (
        <div className="card" style={{ marginBottom: 24, maxWidth: 400 }}>
          <label>Step 1 — booking for which member?</label>
          {members.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              No members yet. <Link to="/members">Add a member first →</Link>
            </p>
          ) : (
            <select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
              <option value="">— select a member —</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {!isMember && members.length > 0 && (
        <p className="muted" style={{ marginTop: -8, marginBottom: 16 }}>
          Step 2 — click <b>Book</b> on a class below.
        </p>
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
                    <button className="btn btn-danger btn-sm" style={{ marginTop: 12 }}
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
          <p className="muted">
            No classes scheduled yet. <Link to="/schedule">Create a session first →</Link>
          </p>}
      </div>
    </div>
  );
}
