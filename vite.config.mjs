import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Automatically adapt base path: '/Wardrobe/' for GitHub Actions Pages deployment, '/' for Cloud Run / AI Studio dev & preview
const base = process.env.VITE_BASE || (process.env.GITHUB_ACTIONS ? '/Wardrobe/' : '/');

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ['react', 'react-dom', 'react-dom/client'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-dom/client'],
  },
});
