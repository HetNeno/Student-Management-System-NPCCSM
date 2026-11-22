import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev:  React on :3000, /api proxied to Laravel on :8000 (same origin -> session
//       cookie + CSRF work without CORS).
// Prod: `npm run build` writes the SPA into Laravel's public/spa, and Laravel
//       serves index.html for every non-API path (see NPCCSM-PHP/routes/web.php).
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/spa/' : '/',
  build: {
    outDir: 'NPCCSM-PHP/public/spa',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: false,
      },
    },
  },
  preview: {
    port: 3000,
  },
}));
