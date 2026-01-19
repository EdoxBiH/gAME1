
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Ovo omogućava kodu da koristi process.env.API_KEY u browseru
    'process.env': {
      API_KEY: process.env.API_KEY || ''
    }
  },
  server: {
    hmr: {
      overlay: false
    }
  }
});
