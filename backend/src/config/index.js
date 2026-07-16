// Central configuration loader.
// WHY: every environment value the app needs is read here once, so the rest of
// the code imports `config` instead of touching process.env directly. This keeps
// configuration in one place and easy to audit.

require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT, 10) || 4000,

  // Allowed browser origins for CORS (comma-separated in the env var).
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim()),

  databaseUrl: process.env.DATABASE_URL,

  jwt: {
    // SECURITY: in production a missing JWT_SECRET must be a hard failure —
    // falling back to a known string would let anyone forge login tokens.
    secret: process.env.JWT_SECRET
      || (process.env.NODE_ENV === 'production' ? null : 'dev-only-insecure-secret'),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  },
};

if (!config.jwt.secret) {
  throw new Error('JWT_SECRET environment variable must be set in production');
}

module.exports = config;
