// Email notifications via Resend's REST API (no SDK dependency needed).
// WHY: booking confirmations and payment receipts make the app feel real to
// members. Fire-and-forget by design: emails NEVER block or fail a request —
// without RESEND_API_KEY (or a recipient) sending is silently skipped, so the
// app works identically in dev/demo.

const config = require('../config');

// Low-level send. Returns true if accepted; never throws.
async function send({ to, subject, html }) {
  if (!config.email.resendApiKey || !to) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.email.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: config.email.from, to: [to], subject, html }),
    });
    if (!res.ok) console.error('Email send failed:', res.status, await res.text());
    return res.ok;
  } catch (err) {
    console.error('Email send error:', err.message);
    return false;
  }
}

// Shared minimal template so every mail looks consistent.
function wrap(gymName, bodyHtml) {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f172a">
    <h2 style="margin:0 0 4px">${gymName}</h2>
    <div style="height:3px;background:#4f46e5;width:48px;border-radius:2px;margin-bottom:18px"></div>
    ${bodyHtml}
    <p style="color:#64748b;font-size:12px;margin-top:28px">Sent by ${gymName} via Gym Manager.</p>
  </div>`;
}

// Booking confirmation to the member.
function bookingConfirmation({ to, gymName, memberName, sessionTitle, startsAt }) {
  const when = new Date(startsAt).toLocaleString();
  return send({
    to,
    subject: `Booking confirmed — ${sessionTitle}`,
    html: wrap(gymName, `
      <p>Hi ${memberName},</p>
      <p>Your spot is confirmed:</p>
      <p style="font-size:16px"><b>${sessionTitle}</b><br>${when}</p>
      <p>Show your QR code from the app at the door to check in. See you there!</p>`),
  });
}

// Payment receipt to the member.
function paymentReceipt({ to, gymName, memberName, amountText, description }) {
  return send({
    to,
    subject: `Payment receipt — ${amountText}`,
    html: wrap(gymName, `
      <p>Hi ${memberName},</p>
      <p>We've received your payment:</p>
      <p style="font-size:16px"><b>${amountText}</b>${description ? `<br>${description}` : ''}</p>
      <p>Thank you!</p>`),
  });
}

// Welcome mail to a new gym owner after signup.
function ownerWelcome({ to, gymName, slug }) {
  return send({
    to,
    subject: `Welcome to Gym Manager — ${gymName}`,
    html: wrap(gymName, `
      <p>Your gym is ready! 🎉</p>
      <p>Your gym code is <b>${slug}</b> — you (and your members) use it to sign in.</p>
      <p>Next steps: create a membership plan, add members, and schedule your first classes.</p>`),
  });
}

module.exports = { send, bookingConfirmation, paymentReceipt, ownerWelcome };
