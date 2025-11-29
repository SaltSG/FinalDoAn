import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'Cross-Origin-Embedder-Policy': 'unsafe-none'
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true
      },
      // Proxy Socket.IO WebSocket traffic to backend
      '/socket.io': {
        target: 'http://127.0.0.1:5000',
        ws: true,
        changeOrigin: true
      },
      // Proxy uploads so images can be loaded via same-origin URL /uploads/*
      '/uploads': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true
      }
    }
  }
});


