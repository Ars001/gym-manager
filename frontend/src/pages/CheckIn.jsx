// Staff check-in. Four ways to check a member in:
//   1) Search a member by name -> see their booked classes -> one-click check-in
//      (the fast "walk-in" flow).
//   2) Pick a session and mark people from its roster.
//   3) Scan a member's booking QR with the camera.
//   4) Paste/type a booking code as a fallback.
// All call the same POST /bookings/:id/check-in endpoint.

import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import QrScanner from '../components/QrScanner.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import MemberPicker from '../components/MemberPicker.jsx';

export default function CheckIn() {
  const [members, setMembers] = useState([]);
  const [pickId, setPickId] = useState('');
  const [memberBookings, setMemberBookings] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState('');
  const [roster, setRoster] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/sessions').then((res) => setSessions(res.data.filter((s) => s.status === 'scheduled'))).catch(() => {});
    api.get('/members').then((res) => setMembers(res.data)).catch(() => {});
  }, []);

  const loadRoster = useCallback(() => {
    if (!sessionId) { setRoster([]); return; }
    api.get('/bookings', { params: { session_id: sessionId } })
      .then((res) => setRoster(res.data.filter((b) => b.status !== 'cancelled')))
      .catch(() => {});
  }, [sessionId]);
  useEffect(loadRoster, [loadRoster]);

  const loadMemberBookings = useCallback(() => {
    if (!pickId) { setMemberBookings([]); return; }
    api.get('/bookings', { params: { member_id: pickId } })
      .then((res) => setMemberBookings(res.data.filter((b) => b.status !== 'cancelled')))
      .catch(() => {});
  }, [pickId]);
  useEffect(loadMemberBookings, [loadMemberBookings]);

  // Shared check-in call used by every flow; refreshes whichever lists are open.
  const checkInById = useCallback(async (bookingId) => {
    setMessage('');
    try {
      const res = await api.post(`/bookings/${String(bookingId).trim()}/check-in`);
      setMessage(`✅ Checked in: ${res.data.first_name || ''} ${res.data.last_name || ''}`.trim() || '✅ Checked in');
      loadRoster();
      loadMemberBookings();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Check-in failed — invalid code?');
    }
  }, [loadRoster, loadMemberBookings]);

  const onScan = useCallback((decoded) => { setScanning(false); checkInById(decoded); }, [checkInById]);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Check-in</h1>
          <div className="subtitle">Find a member, mark a roster, or scan a QR</div>
        </div>
      </div>

      {message && <div className="notice" style={{ marginBottom: 18 }}>{message}</div>}

      {/* Primary flow: search a member who's at the door */}
      <div className="card" style={{ marginBottom: 24 }}>
        <label>Check in a member</label>
        <div style={{ maxWidth: 420 }}>
          <MemberPicker members={members} value={pickId} onChange={setPickId} placeholder="Type the member's name…" />
        </div>
        {pickId && (
          <div className="table-wrap scroll" style={{ marginTop: 14 }}>
            <table>
              <thead><tr><th>Class</th><th>When</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {memberBookings.map((b) => (
                  <tr key={b.id}>
                    <td>{b.session_title}</td>
                    <td>{b.starts_at ? new Date(b.starts_at).toLocaleString() : '—'}</td>
                    <td><StatusBadge status={b.status} /></td>
                    <td>
                      {b.status === 'attended'
                        ? <span className="muted">✓ done</span>
                        : <button className="btn btn-sm" onClick={() => checkInById(b.id)}>Check in</button>}
                    </td>
                  </tr>
                ))}
                {memberBookings.length === 0 && (
                  <tr><td colSpan="4" className="muted">No bookings for this member.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Session roster */}
      <div className="card" style={{ marginBottom: 24, maxWidth: 420 }}>
        <label>…or open a class roster</label>
        {sessions.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No upcoming sessions. <Link to="/schedule">Schedule one →</Link>
          </p>
        ) : (
          <select value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
            <option value="">— select a session —</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>{s.title} — {new Date(s.starts_at).toLocaleString()}</option>
            ))}
          </select>
        )}
      </div>

      {sessionId && (
        <div className="table-wrap scroll" style={{ marginBottom: 24 }}>
          <table>
            <thead><tr><th>Member</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {roster.map((b) => (
                <tr key={b.id}>
                  <td>{b.first_name} {b.last_name}</td>
                  <td><StatusBadge status={b.status} /></td>
                  <td>
                    {b.status === 'attended'
                      ? <span className="muted">✓ {new Date(b.checked_in_at).toLocaleTimeString()}</span>
                      : <button className="btn btn-sm" onClick={() => checkInById(b.id)}>Check in</button>}
                  </td>
                </tr>
              ))}
              {roster.length === 0 && (
                <tr><td colSpan="3" className="muted">No one booked for this session.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* QR / code fallback */}
      <div className="card">
        <label>…or scan a QR / enter a booking code</label>
        <div style={{ display: 'flex', gap: 8, marginTop: 4, marginBottom: scanning ? 12 : 0 }}>
          <button className="btn btn-secondary" onClick={() => setScanning((s) => !s)}>
            {scanning ? 'Stop camera' : 'Scan QR'}
          </button>
        </div>
        {scanning && <QrScanner onScan={onScan} />}
        <div style={{ display: 'flex', gap: 8, marginTop: 12, maxWidth: 480 }}>
          <input placeholder="Paste a booking code" value={code} onChange={(e) => setCode(e.target.value)} />
          <button className="btn" disabled={!code} onClick={() => checkInById(code)}>Check in</button>
        </div>
      </div>
    </div>
  );
}
