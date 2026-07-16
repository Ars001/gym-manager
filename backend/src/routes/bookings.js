// Bookings + check-in.
// WHY: booking enforces capacity inside a transaction so two people can't take
// the last spot at the same time. Check-in flips an existing booking to
// 'attended' and stamps the time — no separate check-in table needed.

const express = require('express');
const { pool, query } = require('../db/pool');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken);

// GET /api/bookings?session_id=&member_id=  — bookings for a session (staff
// roster) or for a member. A member-role user can only ever see their own.
router.get('/', async (req, res, next) => {
  try {
    let { session_id, member_id } = req.query;
    // Members are locked to their own bookings; staff/admin may filter freely.
    if (req.role === 'member') member_id = req.memberId;

    const result = await query(
      `SELECT b.*, m.first_name, m.last_name, s.title AS session_title, s.starts_at
         FROM bookings b
         JOIN members m ON m.id = b.member_id
         JOIN sessions s ON s.id = b.session_id
        WHERE b.tenant_id = $1
          AND ($2::uuid IS NULL OR b.session_id = $2)
          AND ($3::uuid IS NULL OR b.member_id = $3)
        ORDER BY b.booked_at DESC`,
      [req.tenantId, session_id || null, member_id || null]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/bookings  { session_id, member_id }
// Members book themselves; staff can book on behalf of any member.
router.post('/', async (req, res, next) => {
  const client = await pool.connect();
  try {
    let { session_id, member_id } = req.body;
    // A member-role user can only ever book for their own linked member record.
    if (req.role === 'member') member_id = req.memberId;
    if (!session_id || !member_id) {
      return res.status(400).json({ error: 'session_id and member_id are required' });
    }

    await client.query('BEGIN');

    // Lock the session row so the capacity check is race-safe.
    const sessionRes = await client.query(
      `SELECT capacity FROM sessions
        WHERE id = $1 AND tenant_id = $2 AND status = 'scheduled'
        FOR UPDATE`,
      [session_id, req.tenantId]
    );
    if (!sessionRes.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Session not found or not open for booking' });
    }

    // SECURITY: the member must belong to this tenant (blocks cross-tenant ids).
    const memberRes = await client.query(
      `SELECT 1 FROM members WHERE id = $1 AND tenant_id = $2`,
      [member_id, req.tenantId]
    );
    if (!memberRes.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Member not found' });
    }

    const countRes = await client.query(
      `SELECT COUNT(*)::int AS taken FROM bookings
        WHERE session_id = $1 AND status IN ('booked', 'attended')`,
      [session_id]
    );
    if (countRes.rows[0].taken >= sessionRes.rows[0].capacity) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Session is full' });
    }

    const insertRes = await client.query(
      `INSERT INTO bookings (tenant_id, session_id, member_id, status)
       VALUES ($1, $2, $3, 'booked') RETURNING *`,
      [req.tenantId, session_id, member_id]
    );

    await client.query('COMMIT');
    res.status(201).json(insertRes.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    // Unique index violation => the member already holds a spot in this session.
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Member already booked for this session' });
    }
    next(err);
  } finally {
    client.release();
  }
});

// POST /api/bookings/:id/cancel  — cancel a booking (member cancels own, staff any).
router.post('/:id/cancel', async (req, res, next) => {
  try {
    const ownScope = req.role === 'member' ? 'AND member_id = $3' : '';
    const params = [req.params.id, req.tenantId];
    if (req.role === 'member') params.push(req.memberId);

    const result = await query(
      `UPDATE bookings SET status = 'cancelled'
        WHERE id = $1 AND tenant_id = $2 AND status = 'booked' ${ownScope}
        RETURNING *`,
      params
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Booking not found or not cancellable' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/bookings/:id/check-in  — staff marks a member present.
router.post('/:id/check-in', requireRole('admin', 'staff'), async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE bookings SET status = 'attended', checked_in_at = now()
        WHERE id = $1 AND tenant_id = $2 AND status IN ('booked', 'attended')
        RETURNING *`,
      [req.params.id, req.tenantId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Booking not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
