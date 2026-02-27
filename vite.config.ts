import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          parsing: ['pdfjs-dist', 'mammoth', 'marked'],
          cloud: ['@supabase/supabase-js', '@vercel/blob'],
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
});
