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

// POST /api/auth/register  { gymName, email, password, currency? }
// Self-service gym signup: creates a new tenant (gym) + its first admin user and
// returns a JWT so the owner is logged in immediately. The gym's slug — the
// "gym code" used to log in later — is derived from the name and made unique.
router.post('/register', async (req, res, next) => {
  try {
    const { gymName, email, password, currency } = req.body;
    if (!gymName || !email || !password) {
      return res.status(400).json({ error: 'Gym name, email and password are required' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Build a URL-safe slug and ensure it is unique across tenants.
    const base = String(gymName).toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'gym';
    let slug = base;
    for (let n = 2; ; n++) {
      const exists = await query('SELECT 1 FROM tenants WHERE slug = $1', [slug]);
      if (!exists.rows.length) break;
      slug = `${base}-${n}`;
    }

    // New gyms get a 14-day free trial, counted from created_at (set now).
    const tenantRes = await query(
      `INSERT INTO tenants (slug, name, currency) VALUES ($1, $2, $3) RETURNING id`,
      [slug, gymName, currency || 'USD']
    );
    const tenantId = tenantRes.rows[0].id;

    const passwordHash = await bcrypt.hash(password, 10);
    const userRes = await query(
      `INSERT INTO users (tenant_id, email, password_hash, role)
       VALUES ($1, $2, $3, 'admin') RETURNING id`,
      [tenantId, email, passwordHash]
    );

    const token = jwt.sign(
      { sub: userRes.rows[0].id, tenantId, role: 'admin', memberId: null },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    res.status(201).json({ token, role: 'admin', slug });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
