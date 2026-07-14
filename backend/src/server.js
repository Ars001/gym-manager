// Local / standalone server entry: starts the HTTP listener.
// On serverless hosting (Netlify) the exported app is used directly via
// netlify/functions/api.js instead of this file.

const app = require('./app');
const config = require('./config');

app.listen(config.port, () => {
  console.log(`Gym Manager API listening on http://localhost:${config.port}`);
});
