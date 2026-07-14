// Seeds one demo tenant with an admin login and a little sample data.
// WHY: lets you log in and see the app working immediately after setup, and
// doubles as an example of how a new client/tenant is created.

const bcrypt = require('bcryptjs');
const { pool } = require('./pool');

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1) Demo tenant (this is the "add a new client" pattern — just insert a row).
    const tenantRes = await client.query(
      `INSERT INTO tenants (slug, name, currency, primary_color)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      ['demo', 'Demo Fitness Studio', 'USD', '#2563eb']
    );
    const tenantId = tenantRes.rows[0].id;

    // 2) Admin user for that tenant.
    const passwordHash = await bcrypt.hash('password123', 10);
    await client.query(
      `INSERT INTO users (tenant_id, email, password_hash, role)
       VALUES ($1, $2, $3, 'admin')
       ON CONFLICT (tenant_id, email) DO NOTHING`,
      [tenantId, 'admin@demo.test', passwordHash]
    );

    // 3) A membership plan and a session type to make the UI non-empty.
    await client.query(
      `INSERT INTO membership_plans (tenant_id, name, price_cents, billing_interval)
       VALUES ($1, 'Monthly Unlimited', 4900, 'month')
       ON CONFLICT DO NOTHING`,
      [tenantId]
    );
    await client.query(
      `INSERT INTO session_types (tenant_id, name, description, default_capacity)
       VALUES ($1, 'Group Class', 'General group session', 15)
       ON CONFLICT DO NOTHING`,
      [tenantId]
    );

    await client.query('COMMIT');
    console.log('Seed complete.');
    console.log('  Tenant slug: demo');
    console.log('  Login:       admin@demo.test / password123');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
