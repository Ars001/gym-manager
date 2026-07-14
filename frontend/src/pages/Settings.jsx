// Tenant settings (admin only). This is the "re-skin without code" surface:
// edit gym name, currency, brand colors, and feature toggles. Saving PUTs to
// /api/tenant and reloads the session so branding applies immediately.

import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext.jsx';

// The feature flags the UI knows about. Add a flag here + read it via
// features('key') wherever it should gate a feature.
const FLAGS = [
  { key: 'member_portal', label: 'Member self-service portal' },
  { key: 'retail_pos', label: 'Retail / POS' },
  { key: 'mobile_app', label: 'Mobile app' },
  { key: 'multi_location', label: 'Multi-location' },
];

export default function Settings() {
  const { user, tenant, reload } = useAuth();
  const [form, setForm] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  // Seed the form from the loaded tenant.
  useEffect(() => {
    if (tenant) {
      setForm({
        name: tenant.name || '',
        currency: tenant.currency || 'USD',
        primary_color: tenant.primary_color || '#2563eb',
        secondary_color: tenant.secondary_color || '#1e293b',
        logo_url: tenant.logo_url || '',
        feature_flags: { ...(tenant.feature_flags || {}) },
      });
    }
  }, [tenant]);

  if (user?.role !== 'admin') return <p className="muted">Only admins can edit settings.</p>;
  if (!form) return <p className="muted">Loading…</p>;

  async function save(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    try {
      await api.put('/tenant', {
        ...form,
        logo_url: form.logo_url || null,
      });
      await reload(); // re-applies branding across the app
      setNotice('Settings saved.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save settings');
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <div className="subtitle">Branding, currency, and feature toggles for your gym</div>
        </div>
      </div>
      {notice && <div className="notice" style={{ marginBottom: 16 }}>{notice}</div>}

      <p className="muted" style={{ marginBottom: 16 }}>
        Your gym code (used to sign in): <b>{tenant?.slug}</b>
      </p>

      <form className="card" onSubmit={save} style={{ maxWidth: 640 }}>
        <div className="form-row">
          <label>Gym name</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="grid">
          <div className="form-row">
            <label>Currency</label>
            <input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
          </div>
          <div className="form-row">
            <label>Primary color</label>
            <input type="color" value={form.primary_color}
              onChange={(e) => setForm({ ...form, primary_color: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Secondary color</label>
            <input type="color" value={form.secondary_color}
              onChange={(e) => setForm({ ...form, secondary_color: e.target.value })} />
          </div>
        </div>
        <div className="form-row">
          <label>Logo URL</label>
          <input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
            placeholder="https://…" />
        </div>

        <h3>Features</h3>
        {FLAGS.map((f) => (
          <label key={f.key} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <input type="checkbox" style={{ width: 'auto' }}
              checked={Boolean(form.feature_flags[f.key])}
              onChange={(e) => setForm({
                ...form,
                feature_flags: { ...form.feature_flags, [f.key]: e.target.checked },
              })} />
            {f.label}
          </label>
        ))}

        <div style={{ marginTop: 16 }}>
          <button className="btn">Save settings</button>
        </div>
        {error && <div className="error">{error}</div>}
      </form>
    </div>
  );
}
