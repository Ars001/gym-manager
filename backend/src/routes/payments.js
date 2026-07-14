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

// POST /api/payments/subscribe  { member_id, plan_id }
// Subscribes a member to a recurring plan. With Stripe on, creates a Stripe
// customer + subscription and returns the client secret to confirm the first
// payment; recurring invoices are then recorded by the webhook. Without Stripe
// (dev/demo) it just records one payment and activates the membership.
router.post('/subscribe', requireRole('admin', 'staff'), async (req, res, next) => {
  try {
    const { member_id, plan_id } = req.body;
    if (!member_id || !plan_id) {
      return res.status(400).json({ error: 'member_id and plan_id are required' });
    }

    const memberRes = await query(
      `SELECT id, first_name, last_name, email, stripe_customer_id
         FROM members WHERE id = $1 AND tenant_id = $2`,
      [member_id, req.tenantId]
    );
    const member = memberRes.rows[0];
    if (!member) return res.status(404).json({ error: 'Member not found' });

    const planRes = await query(
      `SELECT * FROM membership_plans WHERE id = $1 AND tenant_id = $2 AND active = true`,
      [plan_id, req.tenantId]
    );
    const plan = planRes.rows[0];
    if (!plan) return res.status(404).json({ error: 'Plan not found or inactive' });
    if (plan.billing_interval === 'one_off') {
      return res.status(400).json({ error: 'One-off plans cannot be subscribed to; use /charge' });
    }

    let clientSecret = null;

    if (stripeService.isEnabled() && plan.stripe_price_id) {
      // 1) Ensure the member has a Stripe customer.
      const customerId = await stripeService.getOrCreateCustomer({
        existingId: member.stripe_customer_id,
        email: member.email,
        name: `${member.first_name} ${member.last_name}`,
      });
      if (!member.stripe_customer_id) {
        await query(`UPDATE members SET stripe_customer_id = $1 WHERE id = $2`, [customerId, member.id]);
      }

      // 2) Create the subscription; metadata lets the webhook attribute invoices.
      const sub = await stripeService.createSubscription({
        customerId,
        priceId: plan.stripe_price_id,
        metadata: { tenant_id: req.tenantId, member_id: member.id, plan_id: plan.id },
      });
      clientSecret = sub.latest_invoice?.payment_intent?.client_secret || null;
      // Recurring payment rows are inserted by the webhook on invoice.paid.
    } else {
      // No Stripe: record a single succeeded payment so demo reporting has data.
      await query(
        `INSERT INTO payments (tenant_id, member_id, amount_cents, currency, type, status, description)
         VALUES ($1, $2, $3, $4, 'subscription', 'succeeded', $5)`,
        [req.tenantId, member.id, plan.price_cents, plan.currency, `Subscription: ${plan.name}`]
      );
    }

    // Activate the membership and link the plan either way.
    await query(
      `UPDATE members SET membership_plan_id = $1, status = 'active' WHERE id = $2 AND tenant_id = $3`,
      [plan.id, member.id, req.tenantId]
    );

    res.status(201).json({ ok: true, clientSecret });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
