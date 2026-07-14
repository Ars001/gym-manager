// Class/session scheduling. Staff create sessions (optionally from a session
// type template), see the upcoming list with booked counts, and cancel a
// session. Datetime-local inputs are converted to ISO before sending.

import { useEffect, useState } from 'react';
import api from '../api/client';

// Empty form template reused on reset.
const EMPTY = { session_type_id: '', title: '', instructor: '', starts_at: '', ends_at: '', capacity: 10 };

export default function Schedule() {
  const [sessions, setSessions] = useState([]);
  const [types, setTypes] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  function load() {
    api.get('/sessions').then((res) => setSessions(res.data)).catch(() => {});
  }
  useEffect(() => {
    load();
    api.get('/session-types').then((res) => setTypes(res.data)).catch(() => {});
  }, []);

  // Picking a type pre-fills title + capacity (still editable).
  function onTypeChange(id) {
    const t = types.find((x) => x.id === id);
    setForm((f) => ({
      ...f,
      session_type_id: id,
      title: t ? t.name : f.title,
      capacity: t ? t.default_capacity : f.capacity,
    }));
  }

  async function createSession(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/sessions', {
        session_type_id: form.session_type_id || null,
        title: form.title,
        instructor: form.instructor || null,
        // datetime-local has no timezone; toISOString normalises to UTC.
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: new Date(form.ends_at).toISOString(),
        capacity: Number(form.capacity),
      });
      setForm(EMPTY);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create session');
    }
  }

  async function cancelSession(id) {
    if (!window.confirm('Cancel this session? Booked members will lose their spot.')) return;
    await api.put(`/sessions/${id}`, { status: 'cancelled' }).catch(() => {});
    load();
  }

  return (
    <div>
      <h1>Schedule</h1>

      <form className="card" style={{ marginBottom: 24 }} onSubmit={createSession}>
        <h3 style={{ marginTop: 0 }}>New session</h3>
        <div className="grid">
          <div className="form-row">
            <label>Type (optional)</label>
            <select value={form.session_type_id} onChange={(e) => onTypeChange(e.target.value)}>
              <option value="">— none —</option>
              {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="form-row">
            <label>Title</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Instructor</label>
            <input value={form.instructor} onChange={(e) => setForm({ ...form, instructor: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Capacity</label>
            <input type="number" min="1" value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Starts</label>
            <input type="datetime-local" value={form.starts_at}
              onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Ends</label>
            <input type="datetime-local" value={form.ends_at}
              onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
          </div>
        </div>
        <button className="btn">Create session</button>
        {error && <div className="error">{error}</div>}
      </form>

      <table>
        <thead>
          <tr><th>Session</th><th>Starts</th><th>Capacity</th><th>Booked</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <tr key={s.id}>
              <td>{s.title}</td>
              <td>{new Date(s.starts_at).toLocaleString()}</td>
              <td>{s.capacity}</td>
              <td>{s.booked_count}</td>
              <td>{s.status}</td>
              <td>
                {s.status === 'scheduled' && (
                  <button className="btn" style={{ background: '#dc2626' }}
                    onClick={() => cancelSession(s.id)}>Cancel</button>
                )}
              </td>
            </tr>
          ))}
          {sessions.length === 0 && (
            <tr><td colSpan="6" className="muted">No sessions scheduled.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
