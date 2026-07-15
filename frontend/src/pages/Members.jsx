// Member management: search, add, inline-edit (name/email/phone/plan/status),
// and delete. Plans are loaded to show names and offer them in dropdowns.

import { useEffect, useState } from 'react';
import api from '../api/client';

const STATUSES = ['active', 'frozen', 'inactive', 'cancelled'];
const EMPTY = { first_name: '', last_name: '', email: '', phone: '', membership_plan_id: '' };

export default function Members() {
  const [members, setMembers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [error, setError] = useState('');

  function load() {
    api.get('/members')
      .then((res) => setMembers(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load members'));
  }
  useEffect(() => {
    load();
    api.get('/plans').then((res) => setPlans(res.data)).catch(() => {});
  }, []);

  async function addMember(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/members', { ...form, membership_plan_id: form.membership_plan_id || null });
      setForm(EMPTY);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add member');
    }
  }

  // Inline single-field updates (plan/status dropdowns) PUT immediately.
  async function update(id, patch) {
    await api.put(`/members/${id}`, patch).catch(() => {});
    load();
  }

  function startEdit(m) {
    setEditingId(m.id);
    setEditForm({ first_name: m.first_name, last_name: m.last_name, email: m.email || '', phone: m.phone || '' });
  }
  async function saveEdit(id) {
    await api.put(`/members/${id}`, editForm).catch(() => {});
    setEditingId(null);
    load();
  }
  async function remove(m) {
    if (!window.confirm(`Delete ${m.first_name} ${m.last_name}? This removes their bookings too.`)) return;
    await api.delete(`/members/${m.id}`).catch(() => {});
    load();
  }

  // Client-side search over the loaded list (name or email).
  const q = search.trim().toLowerCase();
  const shown = q
    ? members.filter((m) =>
        `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
        (m.email || '').toLowerCase().includes(q))
    : members;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Members</h1>
          <div className="subtitle">Manage your gym members, their plans, and membership status.</div>
        </div>
      </div>

      <form className="card" style={{ marginBottom: 24 }} onSubmit={addMember}>
        <h3 style={{ marginTop: 0 }}>Add member</h3>
        <div className="grid">
          <div className="form-row">
            <label>First name</label>
            <input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Last name</label>
            <input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Email</label>
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Phone</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Plan (optional)</label>
            <select value={form.membership_plan_id}
              onChange={(e) => setForm({ ...form, membership_plan_id: e.target.value })}>
              <option value="">— none —</option>
              {plans.filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <button className="btn">Add member</button>
        {error && <div className="error">{error}</div>}
      </form>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
        <input placeholder="Search by name or email…" value={search}
          onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 320 }} />
        <span className="muted">{shown.length} of {members.length} members</span>
      </div>

      <div className="table-wrap scroll">
      <table>
        <thead>
          <tr><th>Name</th><th>Email</th><th>Phone</th><th>Plan</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          {shown.map((m) => (
            <tr key={m.id}>
              {editingId === m.id ? (
                <>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input value={editForm.first_name} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} />
                      <input value={editForm.last_name} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} />
                    </div>
                  </td>
                  <td><input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></td>
                  <td><input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></td>
                  <td colSpan="2" className="muted">editing…</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-sm" onClick={() => saveEdit(m.id)}>Save</button>
                      <button className="btn btn-sm btn-ghost" onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  </td>
                </>
              ) : (
                <>
                  <td>{m.first_name} {m.last_name}</td>
                  <td>{m.email || '—'}</td>
                  <td>{m.phone || '—'}</td>
                  <td>
                    <select value={m.membership_plan_id || ''}
                      onChange={(e) => update(m.id, { membership_plan_id: e.target.value || null })}>
                      <option value="">— none —</option>
                      {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </td>
                  <td>
                    <select value={m.status} onChange={(e) => update(m.id, { status: e.target.value })}>
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-sm btn-ghost" onClick={() => startEdit(m)}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => remove(m)}>Delete</button>
                    </div>
                  </td>
                </>
              )}
            </tr>
          ))}
          {shown.length === 0 && (
            <tr><td colSpan="6" className="muted">{members.length ? 'No matches.' : 'No members yet.'}</td></tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
