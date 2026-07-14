// The Express app WITHOUT binding a port.
// WHY: exporting the app (instead of calling listen here) lets it run two ways
// from the same code — a normal Node server locally (see server.js) and a
// serverless function on Netlify (see netlify/functions/api.js).

const express = require('express');
const cors = require('cors');
const config = require('./config');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

app.use(cors({ origin: config.corsOrigins }));

// Stripe webhook needs the RAW body to verify the signature, so it is mounted
// with express.raw BEFORE the JSON parser. Everything else parses JSON.
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }), require('./routes/webhooks'));

app.use(express.json());

// Health check — handy for uptime probes.
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Feature routes. Each module scopes its own queries by tenant.
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tenant', require('./routes/tenants'));
app.use('/api/members', require('./routes/members'));
app.use('/api/plans', require('./routes/plans'));
app.use('/api/session-types', require('./routes/sessionTypes'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/reports', require('./routes/reports'));

// 404 + error handlers must be registered last.
app.use(notFound);
app.use(errorHandler);

module.exports = app;
