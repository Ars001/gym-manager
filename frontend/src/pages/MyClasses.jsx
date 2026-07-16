// Member portal home: the member's own upcoming classes (with their check-in QR
// and a cancel button) and their past visits. The API scopes /bookings to the
// logged-in member automatically for member-role users.

import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge.jsx';

export default function MyClasses() {
  const [bookings, setBookings] = useState([]);
  const [message, setMessage] = useState('');

  const load = useCallback(() => {
    api.get('/bookings').then((res) => setBookings(res.data)).catch(() => {});
  }, []);
  useEffect(load, [load]);

  async function cancel(id) {
    if (!window.confirm('Cancel this booking?')) return;
    setMessage('');
    try {
      await api.post(`/bookings/${id}/cancel`);
      setMessage('Booking cancelled.');
      load();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Could not cancel this booking.');
    }
  }

  const now = Date.now();
  const upcoming = bookings.filter((b) => b.status === 'booked' && new Date(b.starts_at).getTime() >= now - 60 * 60 * 1000);
  const past = bookings.filter((b) => !upcoming.includes(b) && b.status !== 'cancelled');

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>My classes</h1>
          <div className="subtitle">Show the QR at the door to check in</div>
        </div>
      </div>

      {message && <div className="notice" style={{ marginBottom: 16 }}>{message}</div>}

      <h3>Upcoming</h3>
      <div className="grid" style={{ marginBottom: 26 }}>
        {upcoming.map((b) => (
          <div className="card" key={b.id}>
            <b>{b.session_title}</b>
            <div className="muted" style={{ marginBottom: 10 }}>{new Date(b.starts_at).toLocaleString()}</div>
            <QRCodeSVG value={b.id} size={104} />
            <div>
              <button className="btn btn-sm btn-danger" style={{ marginTop: 12 }}
                onClick={() => cancel(b.id)}>Cancel booking</button>
            </div>
          </div>
        ))}
        {upcoming.length === 0 && (
          <p className="muted">No upcoming classes. <Link to="/booking">Book one →</Link></p>
        )}
      </div>

      <h3>Past visits</h3>
      <div className="table-wrap scroll">
        <table>
          <thead><tr><th>Class</th><th>When</th><th>Status</th></tr></thead>
          <tbody>
            {past.map((b) => (
              <tr key={b.id}>
                <td>{b.session_title}</td>
                <td>{new Date(b.starts_at).toLocaleString()}</td>
                <td><StatusBadge status={b.status} /></td>
              </tr>
            ))}
            {past.length === 0 && <tr><td colSpan="3" className="muted">No visits yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
