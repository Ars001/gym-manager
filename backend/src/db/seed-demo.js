// Rich demo data for the "demo" tenant.
// WHY: fills the app with realistic sample data (members, plans, sessions,
// bookings, check-ins, payments) so every screen and the dashboard have
// something meaningful to show — handy for demos and manual testing.
//
// Safe to run repeatedly: it WIPES the demo tenant's business data first and
// re-inserts a fresh, known dataset. It does NOT touch other tenants, and it
// keeps the demo tenant + admin login intact.
//
//   Run:  npm run db:demo   (from the backend folder)

const bcrypt = require('bcryptjs');
const { pool } = require('./pool');

// Build an ISO timestamp `days` from now, at the given hour (local time).
function at(days, hour = 9) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

// Fisher–Yates shuffle (used to pick distinct random members per session).
function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // --- Ensure the demo tenant + admin exist -----------------------------
    const tenantRes = await client.query(
      `INSERT INTO tenants (slug, name, currency, primary_color)
       VALUES ('demo', 'Demo Fitness Studio', 'USD', '#2563eb')
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`
    );
    const tenantId = tenantRes.rows[0].id;

    const passwordHash = await bcrypt.hash('password123', 10);
    await client.query(
      `INSERT INTO users (tenant_id, email, password_hash, role)
       VALUES ($1, 'admin@demo.test', $2, 'admin')
       ON CONFLICT (tenant_id, email) DO NOTHING`,
      [tenantId, passwordHash]
    );

    // --- Wipe existing business data for a clean, known dataset -----------
    // Order respects foreign keys.
    await client.query(`DELETE FROM bookings WHERE tenant_id = $1`, [tenantId]);
    await client.query(`DELETE FROM payments WHERE tenant_id = $1`, [tenantId]);
    await client.query(`DELETE FROM sessions WHERE tenant_id = $1`, [tenantId]);
    await client.query(`DELETE FROM members  WHERE tenant_id = $1`, [tenantId]);
    await client.query(`DELETE FROM session_types    WHERE tenant_id = $1`, [tenantId]);
    await client.query(`DELETE FROM membership_plans WHERE tenant_id = $1`, [tenantId]);

    // --- Membership plans -------------------------------------------------
    const plans = {};
    for (const [name, cents, interval] of [
      ['Monthly Unlimited', 4900, 'month'],
      ['Annual Unlimited', 49900, 'year'],
      ['Drop-in', 1500, 'one_off'],
    ]) {
      const r = await client.query(
        `INSERT INTO membership_plans (tenant_id, name, price_cents, billing_interval)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [tenantId, name, cents, interval]
      );
      plans[name] = { id: r.rows[0].id, cents };
    }

    // --- Session types ----------------------------------------------------
    const types = {};
    for (const [name, desc, cap, color] of [
      ['Yoga Flow', 'Vinyasa-style class', 20, '#16a34a'],
      ['HIIT', 'High-intensity interval training', 16, '#dc2626'],
      ['Spin', 'Indoor cycling', 12, '#2563eb'],
      ['PT 1:1', 'Personal training', 1, '#9333ea'],
    ]) {
      const r = await client.query(
        `INSERT INTO session_types (tenant_id, name, description, default_capacity, color)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [tenantId, name, desc, cap, color]
      );
      types[name] = { id: r.rows[0].id, cap };
    }

    // --- Members ----------------------------------------------------------
    // Mostly active (for a healthy dashboard) plus a few churned/frozen.
    const memberDefs = [
      ['Ali', 'Khan', 'active', 'Monthly Unlimited', -120],
      ['Sara', 'Ahmed', 'active', 'Monthly Unlimited', -90],
      ['Bilal', 'Hussain', 'active', 'Annual Unlimited', -200],
      ['Ayesha', 'Malik', 'active', 'Monthly Unlimited', -60],
      ['Usman', 'Raza', 'active', 'Monthly Unlimited', -45],
      ['Fatima', 'Sheikh', 'active', 'Annual Unlimited', -300],
      ['Hamza', 'Iqbal', 'active', 'Monthly Unlimited', -30],
      ['Zainab', 'Butt', 'active', 'Monthly Unlimited', -15],
      ['Omar', 'Farooq', 'frozen', 'Monthly Unlimited', -150],
      ['Hina', 'Javed', 'active', 'Drop-in', -10],
      ['Kamran', 'Aslam', 'cancelled', 'Monthly Unlimited', -220],
      ['Nadia', 'Riaz', 'inactive', 'Monthly Unlimited', -180],
    ];
    const members = [];
    for (const [first, last, status, planName, joinedDays] of memberDefs) {
      const email = `${first}.${last}@example.com`.toLowerCase();
      const phone = '0300' + Math.floor(1000000 + Math.random() * 8999999);
      const r = await client.query(
        `INSERT INTO members (tenant_id, first_name, last_name, email, phone, status, membership_plan_id, joined_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [tenantId, first, last, email, phone, status, plans[planName].id, at(joinedDays)]
      );
      members.push({ id: r.rows[0].id, status, planName });
    }
    // Members eligible to actually attend/book (not churned).
    const activeMembers = members.filter((m) => ['active', 'frozen'].includes(m.status));

    // --- Sessions (past = completed w/ attendance, future = open) ---------
    const typeNames = Object.keys(types);
    let ti = 0;
    const nextType = () => {
      const name = typeNames[ti % typeNames.length];
      ti++;
      return { name, ...types[name] };
    };

    const pastDays = [-14, -12, -10, -8, -6, -4, -2, -1];
    const futureDays = [0, 1, 2, 3, 5, 7];
    const sessions = [];

    for (const d of pastDays) {
      const t = nextType();
      const hour = 7 + (Math.abs(d) % 3) * 4; // 7am / 11am / 3pm-ish
      const r = await client.query(
        `INSERT INTO sessions (tenant_id, session_type_id, title, instructor, starts_at, ends_at, capacity, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed') RETURNING id, capacity`,
        [tenantId, t.id, t.name, 'Coach ' + t.name.split(' ')[0], at(d, hour), at(d, hour + 1), t.cap]
      );
      sessions.push({ id: r.rows[0].id, day: d, cap: r.rows[0].capacity, past: true });
    }
    for (const d of futureDays) {
      const t = nextType();
      const hour = 7 + (d % 3) * 4;
      const r = await client.query(
        `INSERT INTO sessions (tenant_id, session_type_id, title, instructor, starts_at, ends_at, capacity, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'scheduled') RETURNING id, capacity`,
        [tenantId, t.id, t.name, 'Coach ' + t.name.split(' ')[0], at(d, hour), at(d, hour + 1), t.cap]
      );
      sessions.push({ id: r.rows[0].id, day: d, cap: r.rows[0].capacity, past: false });
    }

    // --- Bookings ---------------------------------------------------------
    // Past sessions: attended (fills attendance metric). Future: booked.
    let bookingCount = 0;
    for (const s of sessions) {
      const count = Math.min(
        s.cap,
        s.past ? 3 + Math.floor(Math.random() * 4) : 2 + Math.floor(Math.random() * 4)
      );
      const picks = shuffled(activeMembers).slice(0, count);
      const startHour = 7 + (Math.abs(s.day) % 3) * 4;
      for (const m of picks) {
        if (s.past) {
          await client.query(
            `INSERT INTO bookings (tenant_id, session_id, member_id, status, booked_at, checked_in_at)
             VALUES ($1, $2, $3, 'attended', $4, $5)`,
            [tenantId, s.id, m.id, at(s.day - 1), at(s.day, startHour)]
          );
        } else {
          await client.query(
            `INSERT INTO bookings (tenant_id, session_id, member_id, status, booked_at)
             VALUES ($1, $2, $3, 'booked', now())`,
            [tenantId, s.id, m.id]
          );
        }
        bookingCount++;
      }
    }

    // --- Payments ---------------------------------------------------------
    // Recurring subscription charges for members on recurring plans, spread
    // over the last ~3 months (so both all-time and 30-day revenue show), plus
    // a couple of one-off drop-ins and one failed charge.
    let paymentCount = 0;
    for (const m of members) {
      if (m.status === 'cancelled' || m.status === 'inactive') continue;
      const plan = plans[m.planName];
      if (m.planName === 'Drop-in') {
        // A one-off drop-in in the last 30 days.
        await client.query(
          `INSERT INTO payments (tenant_id, member_id, amount_cents, type, status, description, created_at)
           VALUES ($1, $2, $3, 'one_off', 'succeeded', 'Drop-in class', $4)`,
          [tenantId, m.id, plan.cents, at(-Math.floor(Math.random() * 25) - 1)]
        );
        paymentCount++;
        continue;
      }
      // 3 monthly charges: ~65, ~35, ~5 days ago (last one is within 30 days).
      for (const daysAgo of [-65, -35, -5]) {
        await client.query(
          `INSERT INTO payments (tenant_id, member_id, amount_cents, type, status, description, created_at)
           VALUES ($1, $2, $3, 'subscription', 'succeeded', $4, $5)`,
          [tenantId, m.id, plan.cents, `Subscription: ${m.planName}`, at(daysAgo)]
        );
        paymentCount++;
      }
    }
    // One failed charge (should NOT count toward revenue) for realism.
    await client.query(
      `INSERT INTO payments (tenant_id, member_id, amount_cents, type, status, description, created_at)
       VALUES ($1, $2, 4900, 'subscription', 'failed', 'Subscription: Monthly Unlimited', $3)`,
      [tenantId, members[0].id, at(-3)]
    );
    paymentCount++;

    await client.query('COMMIT');

    console.log('Demo data loaded for tenant "demo":');
    console.log(`  Members:  ${members.length}`);
    console.log(`  Plans:    ${Object.keys(plans).length}   Session types: ${Object.keys(types).length}`);
    console.log(`  Sessions: ${sessions.length}   Bookings: ${bookingCount}   Payments: ${paymentCount}`);
    console.log('  Login:    demo / admin@demo.test / password123');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('Demo seed failed:', err.message);
  process.exit(1);
});
