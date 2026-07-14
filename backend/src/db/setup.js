// Runs schema.sql against the configured database.
// WHY: gives a one-command way to create all tables (`npm run db:setup`) without
// needing a heavyweight migration framework for the MVP.

const fs = require('fs');
const path = require('path');
const { pool } = require('./pool');

async function setup() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  console.log('Applying schema.sql ...');
  await pool.query(sql);
  console.log('Schema applied successfully.');
  await pool.end();
}

setup().catch((err) => {
  console.error('Schema setup failed:', err.message);
  process.exit(1);
});
