// Public "How to use" guide — no login required. Shareable at /guide so a
// prospect can read how the app works and reach the demo + contact. Uses the
// app's design tokens so it matches the product's look and theming.

import { Link } from 'react-router-dom';

const STEPS = [
  ['Plans', 'Create your membership plans',
    'Add the plans members pay for — e.g. Monthly Unlimited or a Day Pass. Set the price and how often it bills: weekly, monthly, yearly, or one-off.'],
  ['Members', 'Add your members',
    'Enter each member’s name, email and phone, and put them on a plan. Search, edit, or open a member’s profile to see their full booking and payment history any time.'],
  ['Schedule', 'Schedule your classes',
    'Create a class with its time, instructor and capacity. Tick “Repeat weekly” to build a whole recurring timetable at once — pick the weekdays and how many weeks.'],
  ['Booking', 'Book members into classes',
    'Search a member and tap Book on a class. Capacity is enforced automatically, so a class can never be overbooked. Every booking gets its own QR code.'],
  ['Check-in', 'Check people in at the door',
    'Three fast ways: search the member and tap their class, open a class roster, or scan the QR from their phone. One tap marks them attended.'],
  ['Billing', 'Take payments',
    'Subscribe a member to a recurring plan, or record a one-off charge. Everything appears in the payments list, and you can export it to CSV.'],
  ['Dashboard', 'Watch your numbers',
    'See active vs. lapsed members, revenue (last 30 days & all-time), check-ins, monthly recurring revenue, and charts for revenue, new members and attendance.'],
];

const TIPS = [
  'Works on any device — laptop at the desk, tablet at the door, phone on the go.',
  'Recurring classes let you build a full week’s timetable in seconds.',
  'Every gym’s data is completely separate and private.',
  'Each new gym starts with a 14-day free trial.',
];

export default function Guide() {
  return (
    <div className="guide">
      <style>{`
        .guide { background: var(--bg); color: var(--text); min-height: 100vh; padding: 0 20px 60px; }
        .guide-col { max-width: 760px; margin: 0 auto; }
        .guide-top { display: flex; align-items: center; justify-content: space-between; gap: 12px;
          padding: 20px 0; flex-wrap: wrap; }
        .guide-brand { display: flex; align-items: center; gap: 11px; }
        .guide-logo { width: 42px; height: 42px; border-radius: 12px; background: var(--color-primary);
          color: #fff; display: grid; place-items: center; font-weight: 800; font-size: 18px; }
        .guide-eyebrow { font-size: 12px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase;
          color: var(--color-primary); margin: 26px 0 10px; }
        .guide h1 { font-size: clamp(28px, 6vw, 42px); font-weight: 800; letter-spacing: -.025em;
          line-height: 1.06; margin: 0 0 14px; }
        .guide-lede { font-size: 17.5px; color: var(--text-muted); margin: 0 0 24px; line-height: 1.6; }
        .guide-demo { display: flex; flex-wrap: wrap; gap: 14px 22px; align-items: center;
          justify-content: space-between; }
        .guide-creds { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12.5px; color: var(--text-muted); }
        .guide-creds b { color: var(--text); }
        .guide-sect-title { font-size: 13px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase;
          color: var(--text-muted); margin: 40px 0 6px; padding-bottom: 12px; border-bottom: 1px solid var(--border); }
        .guide-step { display: grid; grid-template-columns: 42px 1fr; gap: 18px; padding: 20px 0;
          border-bottom: 1px solid var(--border); }
        .guide-step:last-child { border-bottom: none; }
        .guide-num { width: 42px; height: 42px; border-radius: 12px; background: var(--primary-tint);
          color: var(--color-primary); display: grid; place-items: center; font-weight: 800; font-size: 17px; }
        .guide-where { display: inline-block; font-family: ui-monospace, Menlo, Consolas, monospace;
          font-size: 12px; color: var(--color-primary); background: var(--primary-tint);
          padding: 2px 8px; border-radius: 6px; margin-bottom: 8px; }
        .guide-step h3 { margin: 0 0 6px; font-size: 18px; font-weight: 700; }
        .guide-step p { margin: 0; color: var(--text-muted); font-size: 15px; line-height: 1.6; }
        .guide-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 6px; }
        .guide-tips { list-style: none; margin: 6px 0 0; padding: 0; display: grid; gap: 10px; }
        .guide-tips li { display: flex; gap: 11px; font-size: 15px; }
        .guide-tips .tick { color: var(--success); font-weight: 800; }
        .guide-contact { text-align: center; padding: 30px; margin-top: 26px; }
        .guide-contact h3 { margin: 0 0 6px; font-size: 22px; }
        .guide-chips { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; margin-top: 16px; }
        .guide-chip { display: inline-flex; align-items: center; gap: 8px; text-decoration: none;
          border: 1px solid var(--border-strong); background: var(--surface-2); color: var(--text);
          padding: 11px 16px; border-radius: 11px; font-weight: 600; font-size: 14.5px; }
        .guide-chip:hover { border-color: var(--color-primary); color: var(--color-primary); }
        .guide-foot { text-align: center; color: var(--text-muted); font-size: 12.5px; margin-top: 34px; }
        @media (max-width: 560px) { .guide-cards { grid-template-columns: 1fr; } }
      `}</style>

      <div className="guide-col">
        <div className="guide-top">
          <div className="guide-brand">
            <div className="guide-logo">G</div>
            <div>
              <div style={{ fontWeight: 700 }}>Gym Manager</div>
              <div className="muted" style={{ fontSize: 12.5 }}>Studio &amp; gym management</div>
            </div>
          </div>
          <Link className="btn" to="/">Open the app →</Link>
        </div>

        <p className="guide-eyebrow">Getting started guide</p>
        <h1>Run your whole gym from one simple screen.</h1>
        <p className="guide-lede">Members, class schedules, online booking, door check-in, payments and
          live reports — all in one place. Here's exactly how to set it up and use it, step by step.</p>

        <div className="card guide-demo">
          <div>
            <b>Try the live demo</b>
            <div className="guide-creds">gym code <b>demo</b> · <b>admin@demo.test</b> · <b>password123</b></div>
          </div>
          <Link className="btn" to="/">Open the app →</Link>
        </div>

        <div className="guide-sect-title">Set up your gym — 7 steps</div>
        {STEPS.map(([where, title, desc], i) => (
          <div className="guide-step" key={where}>
            <div className="guide-num">{i + 1}</div>
            <div>
              <span className="guide-where">{where}</span>
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
          </div>
        ))}

        <div className="guide-sect-title">Make it yours</div>
        <div className="guide-cards">
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Your branding</h3>
            <p className="muted">In Settings, set your gym’s name, logo, colours and currency. Your gym code — used to sign in — is shown here too.</p>
          </div>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Members get their own app</h3>
            <p className="muted">Members sign in with your gym code to book classes, cancel, and pull up their QR code to check in — from their phone.</p>
          </div>
        </div>

        <div className="guide-sect-title">Good to know</div>
        <ul className="guide-tips">
          {TIPS.map((t) => <li key={t}><span className="tick">✓</span><span>{t}</span></li>)}
        </ul>

        <div className="card guide-contact">
          <h3>Want it for your gym?</h3>
          <p className="muted" style={{ margin: 0 }}>Get a free trial or a quick walkthrough — reach out to Arslan.</p>
          <div className="guide-chips">
            <a className="guide-chip" href="https://wa.me/12135825569" target="_blank" rel="noreferrer">💬 WhatsApp +1 (213) 582-5569</a>
            <a className="guide-chip" href="mailto:Muhammadarslan3@outlook.com">✉️ Muhammadarslan3@outlook.com</a>
          </div>
        </div>

        <p className="guide-foot">Gym Manager — affordable gym &amp; studio software you can make your own.</p>
      </div>
    </div>
  );
}
