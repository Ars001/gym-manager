// Stripe webhook handler.
// WHY: Stripe tells us out-of-band when recurring invoices are paid or a
// subscription ends. We verify the signature (using the raw request body — see
// server.js) and update our payments/members tables so reporting stays accurate.
// This router is mounted with express.raw, so req.body here is a Buffer.

const express = require('express');
const { query } = require('../db/pool');
const stripeService = require('../services/stripe');

const router = express.Router();

// POST /api/webhooks/stripe
router.post('/', async (req, res) => {
  // If Stripe isn't configured, there's nothing to verify against.
  if (!stripeService.isEnabled()) return res.status(200).json({ ignored: true });

  let event;
  try {
    event = stripeService.constructEvent(req.body, req.headers['stripe-signature']);
  } catch (err) {
    // Bad signature => reject so Stripe retries / we notice misconfiguration.
    return res.status(400).send(`Webhook signature verification failed: ${err.message}`);
  }

  try {
    switch (event.type) {
      // A subscription invoice was paid — record the recurring payment.
      case 'invoice.paid': {
        const invoice = event.data.object;
        const meta = invoice.subscription_details?.metadata || {};
        if (meta.tenant_id) {
          await query(
            `INSERT INTO payments (tenant_id, member_id, amount_cents, currency, type, status, description, stripe_subscription_id)
             VALUES ($1, $2, $3, $4, 'subscription', 'succeeded', $5, $6)`,
            [meta.tenant_id, meta.member_id || null, invoice.amount_paid,
             (invoice.currency || 'usd').toUpperCase(), 'Subscription invoice', invoice.subscription]
          );
        }
        break;
      }

      // Payment failed — record it so staff can follow up.
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const meta = invoice.subscription_details?.metadata || {};
        if (meta.tenant_id) {
          await query(
            `INSERT INTO payments (tenant_id, member_id, amount_cents, currency, type, status, description, stripe_subscription_id)
             VALUES ($1, $2, $3, $4, 'subscription', 'failed', $5, $6)`,
            [meta.tenant_id, meta.member_id || null, invoice.amount_due,
             (invoice.currency || 'usd').toUpperCase(), 'Subscription invoice (failed)', invoice.subscription]
          );
        }
        break;
      }

      // Subscription cancelled/ended — mark the member as cancelled.
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const meta = sub.metadata || {};
        if (meta.tenant_id && meta.member_id) {
          await query(
            `UPDATE members SET status = 'cancelled' WHERE id = $1 AND tenant_id = $2`,
            [meta.member_id, meta.tenant_id]
          );
        }
        break;
      }

      default:
        break; // ignore other event types
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook handling error:', err);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

module.exports = router;
