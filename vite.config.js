import { defineConfig } from 'vite';

// devMockStatusPlugin: middleware SOLO del dev server (`npm run dev`) que
// responde a /dev-mock/<status> con exactamente ese código HTTP, headers y
// un body JSON mínimo, sin salir a internet. Reemplaza la dependencia previa
// de httpstat.us para los simuladores de 401/429/500/200 (ver httpClient.js)
// — httpstat.us resultó poco confiable en pruebas reales (ERR_EMPTY_RESPONSE
// intermitente), lo cual es un riesgo justo el día de la defensa si el
// profesor pide ver el error en vivo y la petición externa falla por su
// cuenta. Un `configureServer` de Vite solo se ejecuta dentro del proceso del
// dev server: no forma parte del bundle de cliente, así que no existe ni se
// puede alcanzar en el build de producción (`npm run build` / `vite
// preview`) — no requiere ningún guard adicional de `import.meta.env.DEV`
// aparte de los que ya tienen los simuladores que lo consumen.
const devMockStatusPlugin = () => ({
  name: 'dev-mock-status',
  configureServer(server) {
    server.middlewares.use('/dev-mock', (req, res) => {
      const status = Number(req.url.replace(/^\//, '').split(/[/?]/)[0]);
      if (!Number.isInteger(status) || status < 100 || status > 599) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'status inválido' }));
        return;
      }
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ mock: true, status }));
    });
  },
});

// Vite solo se usa como dev server / bundler de assets estáticos (JS vanilla
// + Tailwind vía PostCSS) — no introduce ninguna dependencia de runtime en el
// código de la app (ver CLAUDE.md, sección 2).
export default defineConfig({
  plugins: [devMockStatusPlugin()],
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
