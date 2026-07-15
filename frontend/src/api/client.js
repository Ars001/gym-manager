// Thin axios wrapper used by every page.
// WHY: one place to set the base URL, attach the auth token, and transparently
// retry transient failures. On free hosting the serverless function + database
// "sleep" when idle, so the first request of the day can be slow or fail while
// they wake up — the retry below turns that into a short delay, not an error.

import axios from 'axios';

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE_URL || '') + '/api',
  timeout: 25000, // generous: cold starts (DB waking up) can take several seconds
});

// Attach the stored JWT (if any) to every outgoing request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Retry transient failures (cold starts / timeouts / 5xx) up to 2 times with a
// short backoff. Real errors (4xx like bad login) are NOT retried.
const MAX_RETRIES = 2;
api.interceptors.response.use(null, async (error) => {
  const config = error.config;
  if (!config) return Promise.reject(error);

  const status = error.response?.status;

  // Expired/invalid session: clear the token and return to login. Skipped for
  // the login request itself, where 401 just means wrong credentials.
  if (status === 401 && localStorage.getItem('token') && !String(config.url || '').includes('/auth/login')) {
    localStorage.removeItem('token');
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.location.assign('/');
    }
    return Promise.reject(error);
  }

  const isTimeout = error.code === 'ECONNABORTED';
  const isNetwork = !error.response; // no response = network error / timeout
  const isServerCold = status === 502 || status === 503 || status === 504;
  const transient = isTimeout || isNetwork || isServerCold;

  config._retryCount = config._retryCount || 0;
  if (!transient || config._retryCount >= MAX_RETRIES) return Promise.reject(error);

  config._retryCount += 1;
  await new Promise((r) => setTimeout(r, 1500 * config._retryCount));
  return api(config);
});

export default api;
