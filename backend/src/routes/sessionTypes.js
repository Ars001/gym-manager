// Session type templates ("Yoga Flow", "CrossFit WOD", "PT 1:1").
// WHY: generic templates keep the app gym-agnostic — a new client just defines
// their own types instead of us special-casing each gym style in code.

const express = require('express');
const { query } = require('../db/pool');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken);

// GET /api/session-types
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM session_types WHERE tenant_id = $1 ORDER BY name`,
      [req.tenantId]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/session-types  (staff/admin only)
router.post('/', requireRole('admin', 'staff'), async (req, res, next) => {
  try {
    const { name, description, color, default_capacity, default_duration_min } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const result = await query(
      `INSERT INTO session_types (tenant_id, name, description, color, default_capacity, default_duration_min)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.tenantId, name, description || null, color || null,
       default_capacity || 10, default_duration_min || 60]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
