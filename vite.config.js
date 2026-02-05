import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Headers de segurança
const securityHeaders = {
  // Previne cache de dados sensíveis
  'Cache-Control': 'no-store',
  // Previne que o navegador adivinhe o tipo MIME
  'X-Content-Type-Options': 'nosniff',
  // Previne clickjacking - página não pode ser exibida em iframe
  'X-Frame-Options': 'DENY',
  // Habilita proteção XSS do navegador (legacy, mas ainda útil)
  'X-XSS-Protection': '1; mode=block',
  // Controla quais informações de referrer são enviadas
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // Controla quais recursos o navegador pode carregar
  // NOTA: Em desenvolvimento é mais permissivo, ajustar em produção
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://sdk.mercadopago.com https://*.supabase.co",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.supabase.co https://via.placeholder.com https://*.googleusercontent.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.mercadopago.com https://nominatim.openstreetmap.org",
    "frame-src 'self' https://www.mercadopago.com.br https://www.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ].join('; '),
  // Controla recursos e APIs do navegador
  'Permissions-Policy': 'geolocation=(self), camera=(), microphone=()'
};

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    headers: securityHeaders
  },
  preview: {
    headers: securityHeaders
  },
  optimizeDeps: {
    force: true
  },
  build: {
    outDir: 'dist',
    // Sourcemaps apenas em desenvolvimento para segurança
    sourcemap: mode === 'development'
  }
}));
