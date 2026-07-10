# La Ruta del Campeón

Aplicación web (Vanilla JS + Tailwind CSS) para el curso ISW-521. Construye el itinerario de partidos de un equipo del Mundial 2026, cruzando datos de equipos, partidos y estadios desde la API pública `https://worldcup26.ir`.

El detalle funcional completo (requisitos, endpoints, diseño) vive en `context/requirements.md`, `context/api-reference.md` y `context/DESIGN.md`.

## Requisitos

- Node.js (v18 o superior recomendado)
- npm

## Instalación

```bash
npm install
```

## Desarrollo

Levanta el servidor de desarrollo (Vite):

```bash
npm run dev
```

## Build de Tailwind / producción

```bash
npm run build
```

Genera el build de producción (Vite + Tailwind) en `dist/`. Para previsualizar ese build localmente:

```bash
npm run preview
```

## Endpoints consumidos

La app consume los siguientes endpoints de `context/api-reference.md`:

- `POST /auth/authenticate` — login (`{ email, password }` → `{ user, token }`)
- `GET /get/teams` — listado de equipos
- `GET /get/games` — listado de partidos
- `GET /get/stadiums` — listado de estadios

`POST /auth/register` se usa una única vez fuera del flujo de la app (vía Swagger/curl) y no es consumido por el código. `GET /get/groups` está fuera de alcance y no se usa.
