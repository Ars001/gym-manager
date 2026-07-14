// Single shared PostgreSQL connection pool.
// WHY: the `pg` Pool reuses connections across requests. We export a small
// `query` helper so every model/route runs SQL the same way.

const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool({
  connectionString: config.databaseUrl,
  // Managed Postgres providers (Supabase/Neon) require SSL. Local usually doesn't.
  ssl: config.databaseUrl && config.databaseUrl.includes('localhost')
    ? false
    : { rejectUnauthorized: false },
});

// Thin wrapper so callers don't import the pool object everywhere.
function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };
