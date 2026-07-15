// Class/session scheduling. Create a one-off session, a weekly-recurring set of
// sessions, or edit/cancel/delete existing ones. Datetime-local inputs are
// converted to ISO before sending.

import { useEffect, useState } from 'react';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge.jsx';

const EMPTY = { session_type_id: '', title: '', instructor: '', starts_at: '', ends_at: '', capacity: 10 };
// Weekday chips (value = JS getDay()).
const WEEKDAYS = [['Mon', 1], ['Tue', 2], ['Wed', 3], ['Thu', 4], ['Fri', 5], ['Sat', 6], ['Sun', 0]];

// ISO -> value for <input type="datetime-local"> in local time.
function toLocalInput(iso) {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function Schedule() {
  const [sessions, setSessions] = useState([]);
  const [types, setTypes] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [repeat, setRepeat] = useState(false);
  const [weekdays, setWeekdays] = useState([]);
  const [weeks, setWeeks] = useState(4);
  const [error, setError] = useState('');

  function load() {
    api.get('/sessions').then((res) => setSessions(res.data)).catch(() => {});
  }
  useEffect(() => {
    load();
    api.get('/session-types').then((res) => setTypes(res.data)).catch(() => {});
  }, []);

  function onTypeChange(id) {
    const t = types.find((x) => x.id === id);
    setForm((f) => ({ ...f, session_type_id: id, title: t ? t.name : f.title, capacity: t ? t.default_capacity : f.capacity }));
  }

  function resetForm() {
    setForm(EMPTY); setEditingId(null); setRepeat(false); setWeekdays([]); setWeeks(4);
  }

  // Expand the weekly pattern into concrete session rows.
  function buildRecurring() {
    const start = new Date(form.starts_at);
    const durationMs = new Date(form.ends_at) - start;
    const base = new Date(start); base.setHours(0, 0, 0, 0);
    const h = start.getHours(), mi = start.getMinutes();
    const out = [];
    for (let i = 0; i < weeks * 7; i++) {
      const d = new Date(base); d.setDate(base.getDate() + i);
      if (weekdays.includes(d.getDay())) {
        const s = new Date(d); s.setHours(h, mi, 0, 0);
        out.push({
          title: form.title, instructor: form.instructor || null,
          capacity: Number(form.capacity), session_type_id: form.session_type_id || null,
          starts_at: s.toISOString(), ends_at: new Date(s.getTime() + durationMs).toISOString(),
        });
      }
    }
    return out;
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!form.title || !form.starts_at || !form.ends_at) { setError('Title, start and end are required'); return; }
    try {
      if (editingId) {
        await api.put(`/sessions/${editingId}`, {
          title: form.title, instructor: form.instructor || null, capacity: Number(form.capacity),
          starts_at: new Date(form.starts_at).toISOString(), ends_at: new Date(form.ends_at).toISOString(),
        });
      } else if (repeat) {
        if (weekdays.length === 0) { setError('Pick at least one weekday to repeat on'); return; }
        const list = buildRecurring();
        if (list.length === 0) { setError('That pattern produced no sessions'); return; }
        await api.post('/sessions/bulk', { sessions: list });
      } else {
        await api.post('/sessions', {
          session_type_id: form.session_type_id || null, title: form.title, instructor: form.instructor || null,
          starts_at: new Date(form.starts_at).toISOString(), ends_at: new Date(form.ends_at).toISOString(),
          capacity: Number(form.capacity),
        });
      }
      resetForm();
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save session');
    }
  }

  function startEdit(s) {
    setEditingId(s.id); setRepeat(false);
    setForm({
      session_type_id: s.session_type_id || '', title: s.title, instructor: s.instructor || '',
      starts_at: toLocalInput(s.starts_at), ends_at: toLocalInput(s.ends_at), capacity: s.capacity,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  async function cancelSession(id) {
    if (!window.confirm('Cancel this session? Booked members will lose their spot.')) return;
    await api.put(`/sessions/${id}`, { status: 'cancelled' }).catch(() => {});
    load();
  }
  async function removeSession(id) {
    if (!window.confirm('Delete this session permanently? This also removes its bookings.')) return;
    await api.delete(`/sessions/${id}`).catch(() => {});
    load();
  }

  const toggleWeekday = (v) => setWeekdays((w) => w.includes(v) ? w.filter((x) => x !== v) : [...w, v]);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Schedule</h1>
          <div className="subtitle">Create classes (one-off or recurring) and manage sessions</div>
        </div>
      </div>

      <form className="card" style={{ marginBottom: 24 }} onSubmit={submit}>
        <h3 style={{ marginTop: 0 }}>{editingId ? 'Edit session' : 'New session'}</h3>
        <div className="grid">
          {!editingId && (
            <div className="form-row">
              <label>Type (optional)</label>
              <select value={form.session_type_id} onChange={(e) => onTypeChange(e.target.value)}>
                <option value="">— none —</option>
                {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}
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
            <input type="number" min="1" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
          </div>
          <div className="form-row">
            <label>{repeat ? 'First class — starts' : 'Starts'}</label>
            <input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Ends</label>
            <input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
          </div>
        </div>

        {!editingId && (
          <div style={{ marginTop: 8 }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" style={{ width: 'auto' }} checked={repeat} onChange={(e) => setRepeat(e.target.checked)} />
              Repeat weekly
            </label>
            {repeat && (
              <div style={{ marginTop: 10, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {WEEKDAYS.map(([label, v]) => (
                    <button type="button" key={v} onClick={() => toggleWeekday(v)}
                      className={weekdays.includes(v) ? 'btn btn-sm' : 'btn btn-sm btn-ghost'}>{label}</button>
                  ))}
                </div>
                <span className="muted">for</span>
                <input type="number" min="1" max="26" value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} style={{ width: 70 }} />
                <span className="muted">weeks (uses the time above; day is set by the chips)</span>
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
          <button className="btn">{editingId ? 'Save changes' : repeat ? 'Create recurring classes' : 'Create session'}</button>
          {editingId && <button type="button" className="btn btn-ghost" onClick={resetForm}>Cancel</button>}
        </div>
        {error && <div className="error">{error}</div>}
      </form>

      <div className="table-wrap scroll">
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
                <td><StatusBadge status={s.status} /></td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {s.status === 'scheduled' && <button className="btn btn-sm btn-ghost" onClick={() => startEdit(s)}>Edit</button>}
                    {s.status === 'scheduled' && <button className="btn btn-sm btn-ghost" onClick={() => cancelSession(s.id)}>Cancel</button>}
                    <button className="btn btn-sm btn-danger" onClick={() => removeSession(s.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr><td colSpan="6" className="muted">No sessions scheduled.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
