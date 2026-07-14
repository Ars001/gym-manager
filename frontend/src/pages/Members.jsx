// Member management: list existing members and add a new one.
// A working example of the CRUD pattern the other admin screens will follow.

import { useEffect, useState } from 'react';
import api from '../api/client';

export default function Members() {
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '' });
  const [error, setError] = useState('');

  function load() {
    api.get('/members')
      .then((res) => setMembers(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load members'));
  }
  useEffect(load, []);

  async function addMember(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/members', form);
      setForm({ first_name: '', last_name: '', email: '', phone: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add member');
    }
  }

  return (
    <div>
      <h1>Members</h1>

      <form className="card" style={{ marginBottom: 24 }} onSubmit={addMember}>
        <h3 style={{ marginTop: 0 }}>Add member</h3>
        <div className="grid">
          <div className="form-row">
            <label>First name</label>
            <input value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Last name</label>
            <input value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Email</label>
            <input value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Phone</label>
            <input value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
        </div>
        <button className="btn">Add member</button>
        {error && <div className="error">{error}</div>}
      </form>

      <table>
        <thead>
          <tr><th>Name</th><th>Email</th><th>Phone</th><th>Status</th></tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id}>
              <td>{m.first_name} {m.last_name}</td>
              <td>{m.email || '—'}</td>
              <td>{m.phone || '—'}</td>
              <td>{m.status}</td>
            </tr>
          ))}
          {members.length === 0 && (
            <tr><td colSpan="4" className="muted">No members yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
