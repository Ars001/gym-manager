// Membership plan CRUD.
// WHY: plans define what members pay for. When Stripe is configured and the plan
// is recurring, we create a matching Stripe Price so it can back a subscription.

const express = require('express');
const { query } = require('../db/pool');
const { verifyToken, requireRole } = require('../middleware/auth');
const stripeService = require('../services/stripe');

const router = express.Router();
router.use(verifyToken);

// GET /api/plans  — all plans for this tenant (any logged-in role may read).
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM membership_plans WHERE tenant_id = $1 ORDER BY active DESC, name`,
      [req.tenantId]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/plans  (admin/staff) — create a plan (+ Stripe Price if recurring).
router.post('/', requireRole('admin', 'staff'), async (req, res, next) => {
  try {
    const { name, price_cents, currency = 'USD', billing_interval = 'month' } = req.body;
    if (!name || price_cents == null) {
      return res.status(400).json({ error: 'name and price_cents are required' });
    }

    // Recurring plans get a Stripe Price up front; one-off plans don't need one.
    let stripePriceId = null;
    if (stripeService.isEnabled() && billing_interval !== 'one_off') {
      stripePriceId = await stripeService.createPrice({
        amountCents: price_cents,
        currency,
        interval: billing_interval, // week | month | year
        productName: name,
      });
    }

    const result = await query(
      `INSERT INTO membership_plans (tenant_id, name, price_cents, currency, billing_interval, stripe_price_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.tenantId, name, price_cents, currency, billing_interval, stripePriceId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/plans/:id  (admin/staff) — rename or (de)activate. Price changes
// should create a new plan so existing subscriptions aren't disturbed.
router.put('/:id', requireRole('admin', 'staff'), async (req, res, next) => {
  try {
    const { name, active } = req.body;
    const result = await query(
      `UPDATE membership_plans SET
          name   = COALESCE($3, name),
          active = COALESCE($4, active)
        WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [req.params.id, req.tenantId, name, active]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Plan not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
