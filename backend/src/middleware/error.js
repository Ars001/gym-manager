// Central error handler + 404 handler.
// WHY: routes can just `throw` or call next(err); this turns errors into clean
// JSON responses and keeps error formatting in one place.

function notFound(req, res) {
  res.status(404).json({ error: 'Not found' });
}

// Express recognises this as an error handler because it takes 4 args.
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
}

module.exports = { notFound, errorHandler };
