// Member self-signup — join an EXISTING gym with its gym code. On success the
// member is logged straight into their portal (My classes / Book a class).

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { IconCheck } from '../components/icons.jsx';

export default function JoinGym() {
  const { joinGym } = useAuth();
  const [form, setForm] = useState({ tenantSlug: '', first_name: '', last_name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await joinGym(form); // logs in on success; App switches to the member portal
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
          <div className="auth-headline">Join your gym online.</div>
          <ul className="auth-points">
            <li><IconCheck /> Book classes from your phone</li>
            <li><IconCheck /> Cancel when plans change</li>
            <li><IconCheck /> Your QR code for fast check-in</li>
          </ul>
        </div>
        <div style={{ opacity: 0.8, fontSize: 13 }}>Gym Manager</div>
      </div>

      <div className="auth-form-wrap">
        <form className="card auth-card" onSubmit={onSubmit}>
          <h1>Join your gym</h1>
          <p className="subtitle" style={{ marginBottom: 20 }}>
            Ask your gym for its <b>gym code</b>, then create your account.
          </p>

          <div className="form-row">
            <label>Gym code</label>
            <input value={form.tenantSlug} onChange={set('tenantSlug')} placeholder="e.g. demo" />
          </div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-row">
              <label>First name</label>
              <input value={form.first_name} onChange={set('first_name')} />
            </div>
            <div className="form-row">
              <label>Last name</label>
              <input value={form.last_name} onChange={set('last_name')} />
            </div>
          </div>
          <div className="form-row">
            <label>Email</label>
            <input type="email" value={form.email} onChange={set('email')} autoComplete="username" />
          </div>
          <div className="form-row">
            <label>Password</label>
            <input type="password" value={form.password} onChange={set('password')}
              autoComplete="new-password" placeholder="at least 6 characters" />
          </div>

          <button className="btn" style={{ width: '100%', marginTop: 4 }} disabled={busy}>
            {busy ? 'Joining…' : 'Join gym'}
          </button>
          {error && <div className="error">{error}</div>}

          <p className="muted" style={{ marginTop: 18, textAlign: 'center' }}>
            Already have an account? <Link to="/">Sign in</Link><br />
            Own a gym? <Link to="/signup">Create your gym →</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
