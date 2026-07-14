// Netlify serverless entry for the Express API.
// Netlify rewrites /api/* to this function (see netlify.toml). Netlify delivers
// the request under the function path (/.netlify/functions/api/...), so we
// restore the /api prefix the Express routes are mounted under, then hand the
// request to the app via serverless-http.

const serverless = require('serverless-http');
const app = require('../../backend/src/app');

const handler = serverless(app);
const FN_PREFIX = '/.netlify/functions/api';

exports.handler = async (event, context) => {
  let path = event.path || '/';
  if (path.startsWith(FN_PREFIX)) path = path.slice(FN_PREFIX.length) || '/';
  if (!path.startsWith('/api')) path = '/api' + (path === '/' ? '' : path);
  event.path = path;
  return handler(event, context);
};
