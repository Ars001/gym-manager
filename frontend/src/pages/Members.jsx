// Member management: list members, add a member (optionally on a plan), and
// edit status / plan inline. Plans are loaded so we can show names and offer
// them in dropdowns.

import { useEffect, useState } from 'react';
import api from '../api/client';

const STATUSES = ['active', 'frozen', 'inactive', 'cancelled'];

export default function Members() {
  const [members, setMembers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', membership_plan_id: '' });
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

  const planName = (id) => plans.find((p) => p.id === id)?.name || '—';

  async function addMember(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/members', { ...form, membership_plan_id: form.membership_plan_id || null });
      setForm({ first_name: '', last_name: '', email: '', phone: '', membership_plan_id: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add member');
    }
  }

  // Inline updates PUT a single field and refresh.
  async function update(id, patch) {
    await api.put(`/members/${id}`, patch).catch(() => {});
    load();
  }

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

      <div className="table-wrap scroll">
      <table>
        <thead>
          <tr><th>Name</th><th>Email</th><th>Phone</th><th>Plan</th><th>Status</th></tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id}>
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
            </tr>
          ))}
          {members.length === 0 && (
            <tr><td colSpan="5" className="muted">No members yet.</td></tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
