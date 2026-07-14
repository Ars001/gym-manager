// Express app entry point. Wires middleware + all route modules and starts the
// HTTP server. Kept as a single file (no microservices) for simplicity.

const express = require('express');
const cors = require('cors');
const config = require('./config');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

app.use(cors({ origin: config.corsOrigins }));
app.use(express.json());

// Health check — handy for Railway/Render uptime probes.
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Feature routes. Each module scopes its own queries by tenant.
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tenant', require('./routes/tenants'));
app.use('/api/members', require('./routes/members'));
app.use('/api/session-types', require('./routes/sessionTypes'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/reports', require('./routes/reports'));

// 404 + error handlers must be registered last.
app.use(notFound);
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Gym Manager API listening on http://localhost:${config.port}`);
});

module.exports = app;
