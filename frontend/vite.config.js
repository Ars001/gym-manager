import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config. The dev server runs on 5173 and proxies /api to the backend so
// the frontend can call the API without hardcoding the backend URL in dev.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
