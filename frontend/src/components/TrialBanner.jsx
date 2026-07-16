// Free-trial banner shown at the top of every page while a gym is on trial.
// Trial = tenant.created_at + 14 days (no extra DB column needed). The demo gym
// is excluded so the shared demo stays clean. Non-blocking by design: when the
// trial ends the app keeps working — a real paywall / platform billing is a
// separate feature to add when charging gyms for real.

import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const TRIAL_DAYS = 14;

export default function TrialBanner() {
  const { tenant } = useAuth();
  const [showInfo, setShowInfo] = useState(false);

  // No banner for the demo gym or before the tenant has loaded.
  if (!tenant?.created_at || tenant.slug === 'demo') return null;

  const ends = new Date(new Date(tenant.created_at).getTime() + TRIAL_DAYS * 86400000);
  const daysLeft = Math.ceil((ends.getTime() - Date.now()) / 86400000);
  const expired = daysLeft <= 0;
  const urgent = !expired && daysLeft <= 3;

  const tone = expired
    ? { bg: 'var(--danger-bg)', fg: 'var(--danger)' }
    : urgent
    ? { bg: 'var(--warning-bg)', fg: 'var(--warning)' }
    : { bg: 'var(--primary-tint)', fg: 'var(--color-primary)' };

  return (
    <div style={{
      background: tone.bg, color: tone.fg, borderRadius: 10, padding: '10px 14px',
      marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12,
      flexWrap: 'wrap', fontSize: 13.5, fontWeight: 600,
    }}>
      <span>
        {expired
          ? '⛔ Your free trial has ended.'
          : `⏳ ${daysLeft} day${daysLeft === 1 ? '' : 's'} left in your free trial.`}
      </span>
      <button className="btn btn-sm" style={{ background: tone.fg, marginLeft: 'auto' }}
        onClick={() => setShowInfo((v) => !v)}>Upgrade</button>
      {showInfo && (
        <div style={{ flexBasis: '100%', fontWeight: 400, marginTop: 4 }}>
          To take a subscription, contact <b>Arslan</b> —{' '}
          <a href="https://wa.me/12135825569" target="_blank" rel="noreferrer">WhatsApp +1 (213) 582-5569</a>
          {' '}·{' '}
          <a href="mailto:Muhammadarslan3@outlook.com">Muhammadarslan3@outlook.com</a>
        </div>
      )}
    </div>
  );
}
