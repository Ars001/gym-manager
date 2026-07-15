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

// GET /api/reports/insights  — deeper metrics for charts: MRR, members by plan,
// revenue by month, new members by week, attendance by week.
router.get('/insights', async (req, res, next) => {
  try {
    const t = [req.tenantId];

    // Monthly Recurring Revenue: active members' plan prices, normalised to /month.
    const mrr = await query(
      `SELECT COALESCE(SUM(
          CASE mp.billing_interval
            WHEN 'month' THEN mp.price_cents
            WHEN 'year'  THEN mp.price_cents / 12.0
            WHEN 'week'  THEN mp.price_cents * 52.0 / 12.0
            ELSE 0 END), 0)::bigint AS mrr_cents
         FROM members m
         JOIN membership_plans mp ON mp.id = m.membership_plan_id
        WHERE m.tenant_id = $1 AND m.status = 'active' AND mp.billing_interval <> 'one_off'`,
      t
    );

    const byPlan = await query(
      `SELECT COALESCE(mp.name, 'No plan') AS plan, COUNT(*)::int AS count
         FROM members m
         LEFT JOIN membership_plans mp ON mp.id = m.membership_plan_id
        WHERE m.tenant_id = $1 AND m.status = 'active'
        GROUP BY mp.name ORDER BY count DESC`,
      t
    );

    const revByMonth = await query(
      `SELECT to_char(date_trunc('month', created_at), 'Mon YYYY') AS label,
              SUM(amount_cents)::bigint AS cents
         FROM payments
        WHERE tenant_id = $1 AND status = 'succeeded'
          AND created_at >= date_trunc('month', now()) - interval '5 months'
        GROUP BY date_trunc('month', created_at)
        ORDER BY date_trunc('month', created_at)`,
      t
    );

    const newByWeek = await query(
      `SELECT to_char(date_trunc('week', joined_at), 'DD Mon') AS label, COUNT(*)::int AS count
         FROM members
        WHERE tenant_id = $1 AND joined_at >= date_trunc('week', now()) - interval '7 weeks'
        GROUP BY date_trunc('week', joined_at)
        ORDER BY date_trunc('week', joined_at)`,
      t
    );

    const attByWeek = await query(
      `SELECT to_char(date_trunc('week', checked_in_at), 'DD Mon') AS label, COUNT(*)::int AS count
         FROM bookings
        WHERE tenant_id = $1 AND status = 'attended'
          AND checked_in_at >= date_trunc('week', now()) - interval '7 weeks'
        GROUP BY date_trunc('week', checked_in_at)
        ORDER BY date_trunc('week', checked_in_at)`,
      t
    );

    res.json({
      mrr_cents: mrr.rows[0].mrr_cents,
      members_by_plan: byPlan.rows,
      revenue_by_month: revByMonth.rows,
      new_members_by_week: newByWeek.rows,
      attendance_by_week: attByWeek.rows,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
