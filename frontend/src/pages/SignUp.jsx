// Gym sign-up — a new gym owner creates their gym (tenant) + admin login in one
// step and is taken straight into the app. Shows a live preview of the "gym
// code" (slug) they'll use to log in later.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { IconCheck } from '../components/icons.jsx';

// Mirror of the backend slug rule, for the live preview only.
function toSlug(name) {
  return String(name).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}

export default function SignUp() {
  const { register } = useAuth();
  const [gymName, setGymName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const gymCode = toSlug(gymName);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      // On success the AuthProvider logs us in, so the app renders itself.
      await register(gymName, email, password);
    } catch (err) {
      setError(err.response?.data?.error || 'Sign-up failed — please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <div className="auth-brand">
        <div className="auth-brand-logo">G</div>
        <div>
          <div className="auth-headline">Start managing your gym in minutes.</div>
          <ul className="auth-points">
            <li><IconCheck /> Create your gym — no setup fee</li>
            <li><IconCheck /> Add members, classes &amp; bookings</li>
            <li><IconCheck /> Take payments &amp; track attendance</li>
            <li><IconCheck /> Your own branding &amp; gym code</li>
          </ul>
        </div>
        <div style={{ opacity: 0.8, fontSize: 13 }}>Gym Manager</div>
      </div>

      <div className="auth-form-wrap">
        <form className="card auth-card" onSubmit={onSubmit}>
          <h1>Create your gym</h1>
          <p className="subtitle" style={{ marginBottom: 20 }}>It’s free to get started.</p>

          <div className="form-row">
            <label>Gym / studio name</label>
            <input value={gymName} onChange={(e) => setGymName(e.target.value)} placeholder="e.g. Iron Fitness Studio" />
            {gymCode && (
              <div className="muted" style={{ marginTop: 6 }}>
                Your gym code (for login): <b>{gymCode}</b>
              </div>
            )}
          </div>
          <div className="form-row">
            <label>Your email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          </div>
          <div className="form-row">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password" placeholder="at least 6 characters" />
          </div>

          <button className="btn" style={{ width: '100%', marginTop: 4 }} disabled={busy}>
            {busy ? 'Creating…' : 'Create gym'}
          </button>
          {error && <div className="error">{error}</div>}

          <p className="muted" style={{ marginTop: 18, textAlign: 'center' }}>
            Already have a gym? <Link to="/">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
