// Payments: record one-off charges and (stubbed) recurring subscriptions.
// WHY: money is recorded in our own `payments` table regardless of Stripe, so
// reporting always works. When Stripe is configured we also create a real
// PaymentIntent; when it isn't, we record the payment as pending for dev/demo.

const express = require('express');
const { query } = require('../db/pool');
const { verifyToken, requireRole } = require('../middleware/auth');
const stripeService = require('../services/stripe');

const router = express.Router();
router.use(verifyToken);

// GET /api/payments  — recent payments for this tenant.
router.get('/', requireRole('admin', 'staff'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT p.*, m.first_name, m.last_name
         FROM payments p LEFT JOIN members m ON m.id = p.member_id
        WHERE p.tenant_id = $1
        ORDER BY p.created_at DESC
        LIMIT 100`,
      [req.tenantId]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/payments/charge  { member_id, amount_cents, currency, description }
// Creates a one-off charge. Returns the Stripe client_secret when Stripe is on.
router.post('/charge', requireRole('admin', 'staff'), async (req, res, next) => {
  try {
    const { member_id, amount_cents, currency = 'USD', description } = req.body;
    if (!amount_cents || amount_cents <= 0) {
      return res.status(400).json({ error: 'amount_cents must be a positive integer' });
    }

    let stripeIntentId = null;
    let clientSecret = null;
    let status = 'pending';

    if (stripeService.isEnabled()) {
      const intent = await stripeService.createPaymentIntent({
        amountCents: amount_cents,
        currency,
        description: description || 'Gym payment',
        metadata: { tenant_id: req.tenantId, member_id: member_id || '' },
      });
      stripeIntentId = intent.id;
      clientSecret = intent.client_secret; // frontend confirms the card with this
    } else {
      // No Stripe key in dev: mark succeeded so demo reporting has data.
      status = 'succeeded';
    }

    const result = await query(
      `INSERT INTO payments (tenant_id, member_id, amount_cents, currency, type, status, description, stripe_payment_intent_id)
       VALUES ($1, $2, $3, $4, 'one_off', $5, $6, $7) RETURNING *`,
      [req.tenantId, member_id || null, amount_cents, currency, status, description || null, stripeIntentId]
    );

    res.status(201).json({ payment: result.rows[0], clientSecret });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
