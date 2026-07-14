// Auth routes: login + current-user lookup.
// WHY: login resolves the tenant by slug, verifies the password, and returns a
// JWT that embeds tenant_id + role so all later requests are correctly scoped.

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db/pool');
const config = require('../config');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login  { tenantSlug, email, password }
router.post('/login', async (req, res, next) => {
  try {
    const { tenantSlug, email, password } = req.body;
    if (!tenantSlug || !email || !password) {
      return res.status(400).json({ error: 'tenantSlug, email and password are required' });
    }

    const result = await query(
      `SELECT u.id, u.tenant_id, u.password_hash, u.role, u.member_id
         FROM users u
         JOIN tenants t ON t.id = u.tenant_id
        WHERE t.slug = $1 AND u.email = $2`,
      [tenantSlug, email]
    );
    const user = result.rows[0];

    // Same generic message whether the user or password is wrong (avoids leaking which).
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { sub: user.id, tenantId: user.tenant_id, role: user.role, memberId: user.member_id },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.json({ token, role: user.role });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me  — returns the logged-in user's basic info + their tenant.
router.get('/me', verifyToken, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.id, u.email, u.role, u.member_id,
              t.id AS tenant_id, t.name AS tenant_name, t.slug
         FROM users u JOIN tenants t ON t.id = u.tenant_id
        WHERE u.id = $1`,
      [req.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
