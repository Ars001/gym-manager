// Scheduled sessions (the calendar). Each session belongs to a tenant and,
// optionally, a session_type. Listing includes a live count of booked spots so
// the booking UI can show remaining capacity.

const express = require('express');
const { query } = require('../db/pool');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken);

// GET /api/sessions?from=&to=  — upcoming sessions with booked counts.
router.get('/', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const result = await query(
      `SELECT s.*,
              st.name AS session_type_name,
              COUNT(b.id) FILTER (WHERE b.status IN ('booked', 'attended')) AS booked_count
         FROM sessions s
         LEFT JOIN session_types st ON st.id = s.session_type_id
         LEFT JOIN bookings b ON b.session_id = s.id
        WHERE s.tenant_id = $1
          AND ($2::timestamptz IS NULL OR s.starts_at >= $2)
          AND ($3::timestamptz IS NULL OR s.starts_at <= $3)
        GROUP BY s.id, st.name
        ORDER BY s.starts_at ASC`,
      [req.tenantId, from || null, to || null]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/sessions  (staff/admin) — create a scheduled session.
router.post('/', requireRole('admin', 'staff'), async (req, res, next) => {
  try {
    const { session_type_id, title, instructor, location, starts_at, ends_at, capacity } = req.body;
    if (!title || !starts_at || !ends_at) {
      return res.status(400).json({ error: 'title, starts_at and ends_at are required' });
    }
    const result = await query(
      `INSERT INTO sessions (tenant_id, session_type_id, title, instructor, location, starts_at, ends_at, capacity)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.tenantId, session_type_id || null, title, instructor || null,
       location || null, starts_at, ends_at, capacity || 10]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/sessions/:id  (staff/admin) — edit or cancel a session.
router.put('/:id', requireRole('admin', 'staff'), async (req, res, next) => {
  try {
    const { title, instructor, location, starts_at, ends_at, capacity, status } = req.body;
    const result = await query(
      `UPDATE sessions SET
          title      = COALESCE($3, title),
          instructor = COALESCE($4, instructor),
          location   = COALESCE($5, location),
          starts_at  = COALESCE($6, starts_at),
          ends_at    = COALESCE($7, ends_at),
          capacity   = COALESCE($8, capacity),
          status     = COALESCE($9, status)
        WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [req.params.id, req.tenantId, title, instructor, location, starts_at, ends_at, capacity, status]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Session not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
