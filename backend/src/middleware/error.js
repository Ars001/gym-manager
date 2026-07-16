// Central error handler + 404 handler.
// WHY: routes can just `throw` or call next(err); this turns errors into clean
// JSON responses and keeps error formatting in one place.
// SECURITY: 5xx messages are NOT sent to the client — internal errors (DB
// hostnames, stack details) must never leak. They are logged server-side only.

function notFound(req, res) {
  res.status(404).json({ error: 'Not found' });
}

// Express recognises this as an error handler because it takes 4 args.
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error(err); // full detail stays in server logs
  const status = err.status || 500;
  const message = status >= 500
    ? 'Something went wrong on our side — please try again.'
    : (err.message || 'Request failed');
  res.status(status).json({ error: message });
}

module.exports = { notFound, errorHandler };
