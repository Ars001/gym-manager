// Staff check-in. Three ways to check a member in:
//   1) Pick a session and mark people from its roster.
//   2) Scan a member's booking QR with the camera.
//   3) Paste/type a booking code (the QR's contents) as a fallback.
// All three call the same POST /bookings/:id/check-in endpoint.

import { useEffect, useState, useCallback } from 'react';
import api from '../api/client';
import QrScanner from '../components/QrScanner.jsx';

export default function CheckIn() {
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState('');
  const [roster, setRoster] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
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

  // Shared check-in call used by roster button, scanner, and manual entry.
  const checkInById = useCallback(async (bookingId) => {
    setMessage('');
    try {
      const res = await api.post(`/bookings/${bookingId.trim()}/check-in`);
      setMessage(`Checked in: ${res.data.first_name || ''} ${res.data.last_name || ''}`.trim() || 'Checked in');
      loadRoster();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Check-in failed — invalid code?');
    }
  }, [loadRoster]);

  // Stable callback for the scanner so it doesn't restart every render.
  const onScan = useCallback((decoded) => {
    setScanning(false);
    checkInById(decoded);
  }, [checkInById]);

  return (
    <div>
      <h1>Check-in</h1>

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button className="btn" onClick={() => setScanning((s) => !s)}>
            {scanning ? 'Stop camera' : 'Scan QR'}
          </button>
        </div>
        {scanning && <QrScanner onScan={onScan} />}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input placeholder="…or paste a booking code" value={code}
            onChange={(e) => setCode(e.target.value)} />
          <button className="btn" disabled={!code} onClick={() => checkInById(code)}>Check in</button>
        </div>
        {message && <div className="muted" style={{ marginTop: 8 }}>{message}</div>}
      </div>

      <div className="card" style={{ marginBottom: 24, maxWidth: 400 }}>
        <label>Session roster</label>
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
                    : <button className="btn" onClick={() => checkInById(b.id)}>Check in</button>}
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
