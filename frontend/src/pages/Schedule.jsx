// Class/session scheduling. Placeholder that already lists upcoming sessions
// from the API; creating/editing sessions is the next build step.

import { useEffect, useState } from 'react';
import api from '../api/client';

export default function Schedule() {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    api.get('/sessions').then((res) => setSessions(res.data)).catch(() => {});
  }, []);

  return (
    <div>
      <h1>Schedule</h1>
      <p className="muted">Upcoming sessions. (Create/edit form — coming next.)</p>
      <table>
        <thead>
          <tr><th>Session</th><th>Starts</th><th>Capacity</th><th>Booked</th></tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <tr key={s.id}>
              <td>{s.title}</td>
              <td>{new Date(s.starts_at).toLocaleString()}</td>
              <td>{s.capacity}</td>
              <td>{s.booked_count}</td>
            </tr>
          ))}
          {sessions.length === 0 && (
            <tr><td colSpan="4" className="muted">No sessions scheduled.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
