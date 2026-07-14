// Staff check-in. Pick a session, see its roster (everyone with an active
// booking), and mark each member present. A future QR flow can call the same
// POST /bookings/:id/check-in endpoint with a scanned booking id.

import { useEffect, useState, useCallback } from 'react';
import api from '../api/client';

export default function CheckIn() {
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState('');
  const [roster, setRoster] = useState([]);

  useEffect(() => {
    // Only scheduled sessions are worth checking people into.
    api.get('/sessions')
      .then((res) => setSessions(res.data.filter((s) => s.status === 'scheduled')))
      .catch(() => {});
  }, []);

  const loadRoster = useCallback(() => {
    if (!sessionId) { setRoster([]); return; }
    api.get('/bookings', { params: { session_id: sessionId } })
      .then((res) => setRoster(res.data.filter((b) => b.status !== 'cancelled')))
      .catch(() => {});
  }, [sessionId]);
  useEffect(loadRoster, [loadRoster]);

  async function checkIn(bookingId) {
    await api.post(`/bookings/${bookingId}/check-in`).catch(() => {});
    loadRoster();
  }

  return (
    <div>
      <h1>Check-in</h1>

      <div className="card" style={{ marginBottom: 24, maxWidth: 400 }}>
        <label>Session</label>
        <select value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
          <option value="">— select a session —</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title} — {new Date(s.starts_at).toLocaleString()}
            </option>
          ))}
        </select>
      </div>

      {sessionId && (
        <table>
          <thead>
            <tr><th>Member</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {roster.map((b) => (
              <tr key={b.id}>
                <td>{b.first_name} {b.last_name}</td>
                <td>{b.status === 'attended' ? 'Checked in' : 'Booked'}</td>
                <td>
                  {b.status === 'attended'
                    ? <span className="muted">✓ {new Date(b.checked_in_at).toLocaleTimeString()}</span>
                    : <button className="btn" onClick={() => checkIn(b.id)}>Check in</button>}
                </td>
              </tr>
            ))}
            {roster.length === 0 && (
              <tr><td colSpan="3" className="muted">No one booked for this session.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
