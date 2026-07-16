// Login screen — split layout: a branded panel + the sign-in form.
// The tenant slug ("gym code") is how one shared deployment knows which gym you
// belong to. Functionality is unchanged; only the presentation is premium.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { IconCheck } from '../components/icons.jsx';

export default function Login() {
  const { login } = useAuth();
  const [tenantSlug, setTenantSlug] = useState('demo');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false); // shows a "waking up" hint on cold starts

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    setSlow(false);
    // If it's taking a while, it's almost certainly the free-tier server waking
    // up — reassure the user instead of looking stuck. (client.js auto-retries.)
    const slowTimer = setTimeout(() => setSlow(true), 2500);
    try {
      await login(tenantSlug, email, password);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed — check your details and that the server is running.');
    } finally {
      clearTimeout(slowTimer);
      setBusy(false);
      setSlow(false);
    }
  }

  return (
    <div className="auth">
      {/* Brand / value panel (hidden on small screens) */}
      <div className="auth-brand">
        <div className="auth-brand-logo">G</div>
        <div>
          <div className="auth-headline">Run your studio, not your spreadsheets.</div>
          <ul className="auth-points">
            <li><IconCheck /> Members, plans &amp; billing in one place</li>
            <li><IconCheck /> Class scheduling &amp; online booking</li>
            <li><IconCheck /> Fast QR check-in at the door</li>
            <li><IconCheck /> Revenue &amp; attendance at a glance</li>
          </ul>
        </div>
        <div style={{ opacity: 0.8, fontSize: 13 }}>Gym Manager</div>
      </div>

      {/* Sign-in form */}
      <div className="auth-form-wrap">
        <form className="card auth-card" onSubmit={onSubmit}>
          <h1>Sign in</h1>
          <p className="subtitle" style={{ marginBottom: 20 }}>Welcome back — enter your details.</p>

          <div className="form-row">
            <label>Gym code</label>
            <input value={tenantSlug} onChange={(e) => setTenantSlug(e.target.value)} autoComplete="organization" />
          </div>
          <div className="form-row">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          </div>
          <div className="form-row">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>

          <button className="btn" style={{ width: '100%', marginTop: 4 }} disabled={busy}>
            {busy ? (slow ? 'Waking up server…' : 'Signing in…') : 'Sign in'}
          </button>
          {busy && slow && (
            <div className="muted" style={{ marginTop: 10, textAlign: 'center' }}>
              ⏳ Waking up the server — the first load of the day can take a few seconds.
            </div>
          )}
          {error && <div className="error">{error}</div>}

          <p className="muted" style={{ marginTop: 16, textAlign: 'center' }}>
            Own a gym? <Link to="/signup">Create your gym →</Link>
          </p>
          <p className="muted" style={{ marginTop: 8, textAlign: 'center' }}>
            Demo login — gym code <b>demo</b> · admin@demo.test · password123
          </p>
        </form>
      </div>
    </div>
  );
}
