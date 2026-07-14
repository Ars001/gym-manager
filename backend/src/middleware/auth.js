// Authentication + authorization middleware.
// WHY: the JWT carries the user's id, tenant_id and role. verifyToken puts those
// on req so every downstream query can scope by req.tenantId — that scoping is
// what keeps one gym's data invisible to another in this multi-tenant app.

const jwt = require('jsonwebtoken');
const config = require('../config');

// Rejects the request unless a valid Bearer token is present.
function verifyToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Missing authentication token' });
  }
  try {
    const payload = jwt.verify(token, config.jwt.secret);
    req.userId = payload.sub;
    req.tenantId = payload.tenantId; // used to scope EVERY tenant query
    req.role = payload.role;
    req.memberId = payload.memberId || null;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Restricts a route to specific roles, e.g. requireRole('admin', 'staff').
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { verifyToken, requireRole };
