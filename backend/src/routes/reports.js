// Reporting dashboard data: attendance, revenue, active vs. churned members.
// WHY: one endpoint returns the summary numbers the dashboard needs, all scoped
// to the caller's tenant and computed in the database (fast, simple).

const express = require('express');
const { query } = require('../db/pool');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken, requireRole('admin', 'staff'));

// GET /api/reports/summary  — headline metrics for the dashboard.
router.get('/summary', async (req, res, next) => {
  try {
    const t = [req.tenantId];

    // Members split by active vs. churned (cancelled/inactive).
    const members = await query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'active')                          AS active_members,
         COUNT(*) FILTER (WHERE status IN ('cancelled', 'inactive'))        AS churned_members,
         COUNT(*)                                                           AS total_members
       FROM members WHERE tenant_id = $1`,
      t
    );

    // Revenue: succeeded payments, all-time and last 30 days.
    const revenue = await query(
      `SELECT
         COALESCE(SUM(amount_cents), 0)                                                          AS revenue_all_cents,
         COALESCE(SUM(amount_cents) FILTER (WHERE created_at >= now() - interval '30 days'), 0)  AS revenue_30d_cents
       FROM payments WHERE tenant_id = $1 AND status = 'succeeded'`,
      t
    );

    // Attendance: check-ins in the last 30 days.
    const attendance = await query(
      `SELECT COUNT(*) AS checkins_30d
         FROM bookings
        WHERE tenant_id = $1 AND status = 'attended'
          AND checked_in_at >= now() - interval '30 days'`,
      t
    );

    res.json({
      members: members.rows[0],
      revenue: revenue.rows[0],
      attendance: attendance.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
