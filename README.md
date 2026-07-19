# WC26 Analytics

Aplicación web construida para el curso **ISW-521 — Programación en Ambiente Web I** (Universidad Técnica Nacional), Categoría A: *Cruce de Datos y Analítica*.

Consume la API pública del Mundial 2026 (`https://worldcup26.ir`) para construir **5 vistas derivadas** distintas, cada una cruzando colecciones de datos (equipos, partidos, grupos, estadios) que no existen como tales en ningún endpoint individual de la API.

![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla_ES6+-F7DF1E?logo=javascript&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-B73BFE?logo=vite&logoColor=white)

---

## Subproyectos incluidos

| # | Nombre | Qué hace |
|---|---|---|
| 2.1 | **La Ruta del Campeón** | Itinerario de partidos de un equipo, cruzando equipos + partidos + estadios |
| 2.2 | **Rastreador de Goleadas** | Partidos con diferencia de gol ≥ 3, ordenados de mayor a menor |
| 2.3 | **El Muro** | Ranking de las 5 mejores defensas (fase de grupos) + su próximo rival |
| 2.4 | **Analítica de Estadios** | Gráfica de barras: aforo vs. partidos albergados, con asistencia potencial |
| 2.5 | **Radar de Empates** | Matriz visual de empates, agrupados por grupo (A–L) |

---

## Características técnicas

**Stack**
- JavaScript puro (Vanilla, ES6+) — sin frameworks ni librerías de JS.
- Tailwind CSS — único framework permitido, exclusivo para estilos.
- Vite — solo como servidor de desarrollo y bundler de build (no como dependencia de runtime).
- `localStorage` para persistencia (sesión, caché de datos, preferencias).

**Arquitectura**
- Separación en capas: `api/` (fetch), `domain/` (lógica de cruce), `ui/` (DOM), `state/` (estado compartido), `utils/` (helpers puros).
- Autenticación JWT contra `POST /auth/authenticate`, con pantalla de login como puerta de entrada.

**Resiliencia**
- Backoff exponencial ante errores 429/500, con countdown visible en tiempo real.
- Modo offline: caché en `localStorage` con indicador visible de datos no actualizados.
- Manejo de sesión expirada (401) sin recargar la página.
- Cada subproyecto implementa además su propio reto de resiliencia específico (degradación parcial ante fallos aislados de un endpoint).

**Accesibilidad**
- Idioma de interfaz conmutable (Español `es-CR` / Inglés), traducción completa.
- Control de tamaño de texto (A− / A / A+).
- Navegación completa por teclado (`Tab`) en tarjetas y controles.

**Seguridad**
- Content Security Policy restrictiva (`script-src 'self'`).
- Sanitización de datos provenientes de la API antes de insertarse en el DOM.
- Validación de formularios del lado del cliente.

**Diseño**
- Interfaz oscura tipo *liquid glass*, con fondo animado y paleta de acento en degradado violeta → magenta.

---

## Instalación

### Requisitos previos
- [Node.js](https://nodejs.org/) 18 o superior.
- Una cuenta registrada en la API (ver paso 3 abajo — no hay registro dentro de la app).

### Pasos

1. Clonar el repositorio e instalar dependencias:
   ```bash
   git clone <url-del-repositorio>
   cd wc26-analytics
   npm install
   ```

2. Crear una cuenta de prueba en la API (una sola vez, fuera de la app):
   ```bash
   curl -X POST https://worldcup26.ir/auth/register \
     -H "Content-Type: application/json" \
     -d '{"name":"Tu Nombre","email":"tu@correo.com","password":"tu-password"}'
   ```

3. Levantar el servidor de desarrollo:
   ```bash
   npm run dev
   ```
   Abre la URL que muestre la terminal (por defecto `http://localhost:5173`) e inicia sesión con el correo y contraseña del paso 2.

### Build de producción

```bash
npm run build
```

Genera los archivos estáticos en `dist/`. Para previsualizar el build localmente:

```bash
npm run preview
```

> ⚠️ El servidor de desarrollo (`npm run dev`) incluye un proxy que resuelve CORS con la API real. El build de producción (`npm run preview` o un despliegue estático) no lo tiene — si se despliega fuera del entorno de desarrollo, la conexión directa a la API podría requerir una solución de proxy adicional.
