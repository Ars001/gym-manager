// Tiny fixed-window rate limiter (in-memory, no dependency).
// WHY: login/signup must not allow unlimited attempts (password brute-forcing,
// signup spam). On serverless the memory is per-instance, so this is a
// best-effort throttle rather than a hard global cap — still enough to make
// automated guessing impractical, with zero infrastructure.

function rateLimit({ windowMs = 10 * 60 * 1000, max = 20 } = {}) {
  const hits = new Map(); // key -> { count, resetAt }

  return (req, res, next) => {
    // Client IP: first entry of x-forwarded-for (set by Netlify/most proxies).
    const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
      .toString().split(',')[0].trim();
    const key = `${ip}:${req.path}`;
    const now = Date.now();

    let entry = hits.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;

    // Opportunistic cleanup so the map can't grow unbounded.
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (now > v.resetAt) hits.delete(k);
    }

    if (entry.count > max) {
      return res.status(429).json({ error: 'Too many attempts — please wait a few minutes and try again.' });
    }
    next();
  };
}

module.exports = rateLimit;
