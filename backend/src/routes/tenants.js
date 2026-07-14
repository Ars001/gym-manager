// Tenant settings routes: read + update the current gym's branding, currency,
// and feature toggles. WHY: this is the "re-skin without code changes" surface —
// the frontend reads these settings to theme itself and show/hide features.

const express = require('express');
const { query } = require('../db/pool');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/tenant  — settings for the caller's own tenant.
router.get('/', verifyToken, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, slug, name, currency, primary_color, secondary_color,
              logo_url, feature_flags, created_at
         FROM tenants WHERE id = $1`,
      [req.tenantId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/tenant  — admin-only update of branding/config.
router.put('/', verifyToken, requireRole('admin'), async (req, res, next) => {
  try {
    const { name, currency, primary_color, secondary_color, logo_url, feature_flags } = req.body;
    const result = await query(
      `UPDATE tenants SET
          name            = COALESCE($2, name),
          currency        = COALESCE($3, currency),
          primary_color   = COALESCE($4, primary_color),
          secondary_color = COALESCE($5, secondary_color),
          logo_url        = COALESCE($6, logo_url),
          feature_flags   = COALESCE($7, feature_flags)
        WHERE id = $1
        RETURNING id, slug, name, currency, primary_color, secondary_color, logo_url, feature_flags`,
      [req.tenantId, name, currency, primary_color, secondary_color, logo_url, feature_flags]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
