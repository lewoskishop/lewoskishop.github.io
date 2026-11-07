// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

/**
 * Hosts autorizados a servir el sitio.
 *
 * Necesario cuando se accede a través de un túnel (Cloudflare, ngrok, etc.) o
 * de un dominio propio: Vite bloquea los pedidos cuyo host no esté en la lista.
 */
const ALLOWED_HOSTS = [
  'lewoskishop.com.ar',
  'www.lewoskishop.com.ar',
  'lewoskishop.webbot.ar',
  '.webbot.ar',
  'localhost',
  '127.0.0.1',
  '192.168.1.203',
];

// Cambiá `site` por el dominio final si hace falta.
export default defineConfig({
  site: 'https://lewoskishop.com.ar/',
  base: '/',
  output: 'static',
  compressHTML: true,
  server: {
    allowedHosts: ALLOWED_HOSTS,
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
