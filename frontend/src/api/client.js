// Thin axios wrapper used by every page.
// WHY: one place to set the base URL and to attach the auth token to requests,
// so pages just call api.get('/members') without repeating auth boilerplate.

import axios from 'axios';

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE_URL || '') + '/api',
});

// Attach the stored JWT (if any) to every outgoing request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
