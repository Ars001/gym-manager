// Online booking. Placeholder: lists bookable sessions with remaining spots.
// The book/cancel actions wire to POST /api/bookings and .../cancel next.

import { useEffect, useState } from 'react';
import api from '../api/client';

export default function Booking() {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    api.get('/sessions').then((res) => setSessions(res.data)).catch(() => {});
  }, []);

  return (
    <div>
      <h1>Book a class</h1>
      <p className="muted">Available sessions. (Book / cancel buttons — coming next.)</p>
      <div className="grid">
        {sessions.map((s) => {
          const remaining = s.capacity - Number(s.booked_count || 0);
          return (
            <div className="card" key={s.id}>
              <b>{s.title}</b>
              <div className="muted">{new Date(s.starts_at).toLocaleString()}</div>
              <div className="muted">{remaining} spots left</div>
              <button className="btn" style={{ marginTop: 12 }} disabled={remaining <= 0}>
                {remaining <= 0 ? 'Full' : 'Book'}
              </button>
            </div>
          );
        })}
        {sessions.length === 0 && <p className="muted">No sessions available.</p>}
      </div>
    </div>
  );
}
