// Member CRUD. Every query is scoped by req.tenantId so a gym only ever sees
// its own members. Staff and admins manage members; members cannot.

const express = require('express');
const { query } = require('../db/pool');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken); // all member routes require login

// GET /api/members?status=&search=  — list members, optionally filtered by
// status and/or a name/email search term.
router.get('/', requireRole('admin', 'staff'), async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const result = await query(
      `SELECT id, first_name, last_name, email, phone, status,
              membership_plan_id, joined_at
         FROM members
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR status = $2)
          AND ($3::text IS NULL OR (first_name ILIKE $3 OR last_name ILIKE $3 OR email ILIKE $3))
        ORDER BY joined_at DESC`,
      [req.tenantId, status || null, search ? `%${search}%` : null]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/members/:id
router.get('/:id', requireRole('admin', 'staff'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM members WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, req.tenantId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Member not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/members  — create a member.
router.post('/', requireRole('admin', 'staff'), async (req, res, next) => {
  try {
    const { first_name, last_name, email, phone, membership_plan_id, notes } = req.body;
    if (!first_name || !last_name) {
      return res.status(400).json({ error: 'first_name and last_name are required' });
    }
    const result = await query(
      `INSERT INTO members (tenant_id, first_name, last_name, email, phone, membership_plan_id, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.tenantId, first_name, last_name, email || null, phone || null, membership_plan_id || null, notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/members/:id  — update editable fields (COALESCE keeps unset fields).
router.put('/:id', requireRole('admin', 'staff'), async (req, res, next) => {
  try {
    const { first_name, last_name, email, phone, status, membership_plan_id, notes } = req.body;
    const result = await query(
      `UPDATE members SET
          first_name         = COALESCE($3, first_name),
          last_name          = COALESCE($4, last_name),
          email              = COALESCE($5, email),
          phone              = COALESCE($6, phone),
          status             = COALESCE($7, status),
          membership_plan_id = COALESCE($8, membership_plan_id),
          notes              = COALESCE($9, notes)
        WHERE id = $1 AND tenant_id = $2
        RETURNING *`,
      [req.params.id, req.tenantId, first_name, last_name, email, phone, status, membership_plan_id, notes]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Member not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/members/:id  — remove a member. Their bookings are removed too
// (FK cascade); past payments are kept but detached (member_id set null).
router.delete('/:id', requireRole('admin', 'staff'), async (req, res, next) => {
  try {
    const result = await query(
      `DELETE FROM members WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [req.params.id, req.tenantId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Member not found' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
