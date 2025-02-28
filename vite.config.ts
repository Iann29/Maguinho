import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      '/api/create-payment-preference': {
        target: 'https://zssitwbdprfnqglttwhs.functions.supabase.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/create-payment-preference/, '/create-payment-preference'),
      },
      '/api/payment-webhook': {
        target: 'https://zssitwbdprfnqglttwhs.functions.supabase.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/payment-webhook/, '/payment-webhook'),
      },
    },
  },
});
