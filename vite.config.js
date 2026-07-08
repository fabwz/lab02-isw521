import { defineConfig } from 'vite';

// Vite solo se usa como dev server / bundler de assets estáticos (JS vanilla
// + Tailwind vía PostCSS) — no introduce ninguna dependencia de runtime en el
// código de la app (ver CLAUDE.md, sección 2).
export default defineConfig({
  server: {
    port: 5173,
    // Proxy de desarrollo: el navegador llama a /wc26-api/* (mismo origen,
    // sin CORS) y Vite reenvía la petición server-to-server a worldcup26.ir,
    // que sí acepta la petición porque no viene de un origen de navegador.
    // Solo existe en `npm run dev`; en producción no aplica (ver httpClient.js).
    proxy: {
      '/wc26-api': {
        target: 'https://worldcup26.ir',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/wc26-api/, ''),
      },
    },
  },
});
