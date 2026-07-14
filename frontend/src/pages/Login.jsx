// Login screen. Collects tenant slug + email + password and calls the auth API.
// The tenant slug is how one shared deployment knows which gym you belong to.

import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const [tenantSlug, setTenantSlug] = useState('demo');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(tenantSlug, email, password);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={onSubmit}>
        <h1>Sign in</h1>
        <div className="form-row">
          <label>Gym code</label>
          <input value={tenantSlug} onChange={(e) => setTenantSlug(e.target.value)} />
        </div>
        <div className="form-row">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="form-row">
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button className="btn" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        {error && <div className="error">{error}</div>}
        <p className="muted" style={{ marginTop: 16 }}>
          Demo: gym code <b>demo</b> · admin@demo.test · password123
        </p>
      </form>
    </div>
  );
}
