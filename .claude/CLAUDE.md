# CLAUDE.md

Este archivo es el contexto de arquitectura para Claude Code al trabajar en este repositorio. Léelo por completo antes de generar o modificar código. Estas reglas **no son sugerencias**: son restricciones de una rúbrica académica y su incumplimiento invalida el proyecto.

---

## 1. Qué es este proyecto

Aplicación web **"La Ruta del Campeón"** para el curso ISW-521 (Programación en Ambiente Web I). Es una SPA de página única que consume la API pública del Mundial 2026 (`https://worldcup26.ir`) para construir un **itinerario de partidos** de un equipo seleccionado, cruzando tres colecciones de datos: equipos, partidos y estadios.

El valor del proyecto **no está en el diseño visual**, está en:
1. La lógica de cruce de datos entre múltiples endpoints.
2. El manejo robusto de errores HTTP (401, 429, 500) y de red.
3. Un código que el estudiante pueda defender y explicar línea por línea en una defensa oral en vivo.

Consulta `context/requirements.md` para el detalle funcional completo, `context/DESIGN.md` para la dirección visual (dark UI, liquid glass, degradados animados, tipografía), y `context/api-reference.md` para los schemas JSON reales de cada endpoint (nombres de campo exactos, tipos de dato, casos borde). Este `CLAUDE.md` es la guía de **cómo construirlo**; los archivos de `/context` son el **qué construir**, **cómo debe verse** y **con qué datos exactos trabajar**.

---

## 2. Stack técnico permitido (restricción dura)

- **JavaScript puro (Vanilla JS), ES6+.** Manipulación de DOM nativa (`document.querySelector`, `createElement`, `addEventListener`, etc.).
- **Tailwind CSS** — único framework permitido, y solo para estilos.
- **`fetch` nativo** para llamadas HTTP.
- **`localStorage`** nativo para caché/offline.
- **Logo WC26:** archivo estático `.png` (ej. `public/wc26-logo.png` o `assets/`), insertado con `<img src="...">`. No es un asset generado por código.
- **Íconos:** Lucide, usados como **SVG inline copiado directo en el HTML/JS** (markup estático desde lucide.dev), **nunca** vía el paquete npm `lucide` ni el script CDN + `lucide.createIcons()` — esa segunda forma introduce una librería de JavaScript en tiempo de ejecución, lo cual rompe la restricción de "sin librerías JS" de este proyecto.

### 🚫 Prohibido usar (sin excepción):
- Cualquier framework o librería de JavaScript: React, Vue, Angular, Svelte, jQuery, Axios, Lodash, etc.
- Bundlers/compiladores complejos que oculten lógica (si se usa un bundler, debe ser mínimo y transparente — ej. Vite solo como dev server, sin introducir dependencias de runtime en JS).
- Cualquier librería de manejo de estado, de fetch, o de UI components.
- El paquete npm `lucide` o su script CDN con `createIcons()` — usar solo el SVG estático de sus íconos, copiado directamente (ver arriba).

**Si Claude Code sugiere instalar una librería de JavaScript para "simplificar" algo (manejo de fechas, HTTP client, state management, iconos), la respuesta correcta es implementarlo a mano en JS puro o SVG estático, no instalar la dependencia.**

---

## 3. Reglas de código no negociables

### 3.1 `async/await` exclusivo
- **Toda** promesa (fetch u otra) se resuelve con `async/await`.
- **Nunca** usar `.then()` / `.catch()` en ningún archivo del proyecto, ni siquiera mezclado con `async/await` en otra función.
- Manejo de errores exclusivamente con `try/catch`.

### 3.2 Prohibiciones absolutas
- ❌ `alert()` — en ningún punto del flujo, ni en debugging, ni en manejo de errores.
- ❌ `.then()` / `.catch()`.
- ❌ `window.location.reload()` (o equivalente, como `location.href = location.href`) para resolver errores de sesión o de red.

Si necesitas notificar algo al usuario, usa componentes de UI propios (toast, modal, banner), nunca `alert()`/`confirm()`/`prompt()`.

### 3.3 Separación de responsabilidades
Ver la estructura de carpetas completa en la **Sección 4**. Regla general: nunca mezclar capas.

- Las funciones en `/api` **solo** hacen fetch y devuelven datos o lanzan errores tipados. Nunca tocan el DOM.
- Las funciones en `/ui` **solo** reciben datos ya procesados y los renderizan. Nunca hacen fetch directamente.
- La lógica de cruce de datos (equipos + partidos + estadios) vive en `/domain`, nunca embebida dentro de un handler de UI ni dentro de una función de `/api`.

---

## 4. Estructura de carpetas del proyecto

Esta es la estructura de referencia. Es intencionalmente compacta — es un laboratorio académico de un solo desarrollador, no un producto de equipo: **la meta es cumplir todo lo exigido de forma ordenada y defendible, no maximizar la cantidad de archivos.** Claude Code debe respetarla al crear o ubicar archivos nuevos; no crear carpetas ni archivos adicionales para lo que ya cabe en uno existente (ej. no separar un archivo por endpoint si son 3 GETs casi idénticos — van juntos).

```
proyecto-ruta-del-campeon/
├── .claude/
│   └── CLAUDE.md             → este archivo — ubicación soportada oficialmente para mantener la raíz del proyecto limpia
├── .gitignore
├── context/
│   ├── requirements.md       → requerimientos funcionales y no funcionales del sistema
│   ├── DESIGN.md             → sistema de diseño: dark UI, liquid glass, degradados animados, tipografía
│   └── api-reference.md      → schemas JSON reales de cada endpoint (campos exactos, tipos de dato, casos borde)
├── README.md                  → vacío por ahora; se completa al final, cuando el proyecto ya funcione (setup, cómo correrlo)
├── index.html
├── package.json              → solo para tooling de Tailwind (build/watch), no runtime de JS
├── tailwind.config.js
│
└── src/
    ├── main.js                → punto de entrada: inicializa la app, registra listeners raíz
    │
    ├── styles/
    │   └── input.css          → directivas @tailwind (base/components/utilities)
    │
    ├── api/                   → CAPA DE DATOS (solo fetch, nunca DOM)
    │   ├── httpClient.js      → wrapper authFetch() + integración con backoff
    │   ├── authApi.js         → POST /auth/authenticate (login usado por la app)
    │   └── worldCupApi.js     → GET /get/teams, /get/games, /get/stadiums (los 3 juntos: mismo patrón, mismo cliente)
    │
    ├── domain/                → LÓGICA DE NEGOCIO / CRUCE DE DATOS (sin fetch, sin DOM) — el corazón evaluado del subproyecto
    │   └── itineraryService.js
    │       - filtrar partidos por equipo (home/away)
    │       - ordenar por local_date
    │       - cruzar stadium_id → datos de estadio
    │       - calcular ciudades distintas visitadas
    │
    ├── state/                 → ESTADO Y PERSISTENCIA (sin DOM)
    │   └── appState.js        → token/user (auth), caché por endpoint con timestamp, equipo seleccionado — todo el estado de la app en un solo módulo, con funciones bien nombradas por responsabilidad
    │
    ├── ui/                    → CAPA DE PRESENTACIÓN (solo DOM, nunca fetch)
    │   ├── loginForm.js       → formulario de login (reutilizado en pantalla completa y en modal 401)
    │   ├── accountMenu.js     → dropdown del ícono de cuenta (user info + logout)
    │   ├── teamSelector.js    → poblar y manejar el <select> de equipos
    │   ├── itineraryCards.js  → render de tarjetas + actualización parcial (ver 5.5 resiliencia)
    │   ├── sessionExpiredModal.js → modal de reautenticación (401), envuelve loginForm.js
    │   └── resilienceBanners.js   → los 3 estados en tiempo real agrupados: countdown 429, backoff 500, badge de caché — comparten patrón visual y de aparición/desaparición, tiene sentido que vivan juntos
    │
    └── utils/                 → HELPERS PUROS (sin estado, sin DOM, sin fetch)
        ├── backoff.js         → fetchWithBackoff(fetchFn, opciones)
        └── format.js          → formateo de fechas, códigos de estadio/país y otros helpers de presentación
```

**Fuera del árbol de `src/`, sin necesidad de carpetas dedicadas todavía:**
- Assets estáticos (logo `.png`, favicon): ahora sí hay un archivo real que meter ahí (el logo WC26) — crear `public/` (o `assets/`) para esto. Íconos de Lucide **no** van aquí como archivos — se copian como SVG inline directo en el código (ver sección 2).
- Salida de build de Tailwind (`dist/` o similar): la genera la herramienta de build; agregar a `.gitignore`, no versionar ni mantener manualmente en el árbol del proyecto.
- `matchesView.js` (vista "Partidos"): **no crear todavía** — está pausado a futuro (ver RF-05b en `requirements.md`). Si se retoma, va en `ui/`.
- Campana de historial (`notificationBell.js`): opcional; si se implementa, es un archivo más dentro de `ui/`, no antes de tener resuelto todo lo obligatorio.

### Reglas de dependencia entre capas (de arriba hacia abajo, nunca al revés)

```
ui  →  domain  →  api
 ↓        ↓         ↓
      state / utils (transversales, usados por cualquier capa)
```

- `ui` puede llamar a `domain` y a `state`, pero **nunca** a `api` directamente.
- `domain` puede llamar a `api` y a `state`, pero **nunca** debe tocar el DOM.
- `api` solo conoce `httpClient` y `utils` (ej. `backoff`). Nunca importa nada de `ui` ni de `domain`.
- `state` y `utils` son transversales y no dependen de ninguna otra capa del proyecto.

Si Claude Code necesita ubicar un archivo nuevo y no encaja claramente en ninguna carpeta, preguntar antes de crear una carpeta nueva no contemplada aquí. Ante la duda entre crear un archivo nuevo o añadir una función a uno existente del mismo dominio de responsabilidad, **preferir añadir a uno existente** — menos archivos que el estudiante tenga que ubicar y explicar de memoria en la defensa oral es una ventaja real, no un defecto.

> **Nota sobre `context/DESIGN.md`:** es la fuente de verdad para paleta de colores, tipografía, efecto liquid glass y fondo animado de toda la interfaz (tarjetas de itinerario, modal de sesión expirada, countdown, indicador offline, etc.). No inventar colores, efectos o tipografías fuera de los tokens definidos ahí — cualquier ajuste visual nuevo debe reflejarse primero en `DESIGN.md` y luego implementarse.

---

## 5. Arquitectura de resiliencia obligatoria

Esta es la parte que más peso tiene en la evaluación y en la defensa oral. Debe implementarse de forma explícita y visible, no como un afterthought.

### 5.1 Autenticación JWT y pantalla de login

**Endpoints reales de auth (fuera de `/get/*`, no llevan header Authorization):**
```
POST https://worldcup26.ir/auth/register     Body: { name, email, password } → { user, token }
POST https://worldcup26.ir/auth/authenticate Body: { email, password }       → { user, token }
```
El registro se hace una sola vez (fuera de la app, vía Swagger/curl). La app **solo consume `/auth/authenticate`**.

- **Pantalla de login como puerta de entrada obligatoria:** si al cargar la app no hay token válido en `localStorage`, se muestra una pantalla completa de login (sin navbar, sin contenido). El formulario llama a `POST /auth/authenticate`.
- Login exitoso → guardar `token` y `user` (memoria + `localStorage`) → mostrar la app (navbar + vista Itinerarios).
- El componente de login es **el mismo** que se reutiliza dentro del modal de 401 (sección 5.2) — no crear dos formularios de login distintos.
- **Cada** llamada a un endpoint de datos (`/get/teams`, `/get/games`, `/get/stadiums`) debe incluir:
  ```
  Authorization: Bearer <token>
  ```
- Crear un wrapper único de fetch autenticado (ej. `authFetch(url, options)`) para no repetir la lógica del header en cada llamada.

### 5.2 Manejo de error 401
- Si cualquier `authFetch` recibe `401`:
  - Limpiar el token de memoria y de `localStorage`.
  - Disparar un **modal** que renderiza el mismo componente de login de 5.1 (mismo formulario, distinto contenedor: pantalla completa vs. modal).
  - **No** recargar la página. Al reautenticarse desde el modal, cerrar el modal y continuar donde el usuario estaba, sin perder el estado de la UI innecesariamente.

> **⚠️ Nota verificada empíricamente (ver `context/api-reference.md`):** la API real de `worldcup26.ir` **no valida el JWT en absoluto** en `/get/*` — ni firma, ni payload, ni que el header exista. Un token corrupto/inventado igual devuelve `200 OK`. Esto significa que **el 401 no se puede provocar mandando un token inválido contra el servidor real**. Es necesario un mecanismo de debug (solo activo en desarrollo, ej. `if (import.meta.env.DEV)`) que fuerce manualmente un `ApiError(401)` para poder demostrar el modal de sesión expirada en la demo/defensa, sin depender de que el servidor lo dispare. Esto no es una falla del código — el manejo de 401 debe implementarse igual (es requisito literal del enunciado), solo que su demostración es simulada por una limitación de la API de terceros.

### 5.3 Backoff exponencial (429 y 500)
- Ante `429` o `500`, reintentar automáticamente: 1s → 2s → 4s → 8s (o similar, exponencial, con un máximo de reintentos razonable, ej. 4-5).
- El backoff debe ser **por petición individual**, no global — si falla `/get/stadiums`, solo esa petición reintenta; `/get/teams` y `/get/games` no se ven afectadas si ya resolvieron.
- Para `429` específicamente: mostrar un **countdown visible** (segundos restantes hasta el próximo intento) en la UI, actualizado en tiempo real.
- Implementar esto como una función utilitaria reusable, ej. `fetchWithBackoff(fetchFn, { maxRetries, onRetry, onCountdown })`, no duplicar la lógica de reintento en cada llamada.

### 5.4 Modo offline con `localStorage`
- Cada respuesta exitosa de `/get/teams`, `/get/games`, `/get/stadiums` se cachea en `localStorage` con una key clara (ej. `cache:teams`, `cache:games`, `cache:stadiums`) y timestamp.
- Si una petición nueva falla (después de agotar los reintentos de backoff) y existe copia cacheada, mostrar esos datos con un indicador visible tipo "⚠️ Datos no actualizados (última sincronización: hh:mm)".

### 5.5 Reto de resiliencia específico de este subproyecto
> Si `/get/stadiums` falla **después** de que el itinerario ya se renderizó con los partidos:
> - Las tarjetas de partidos ya renderizadas **permanecen visibles**, no se destruyen ni se re-renderiza todo desde cero.
> - Solo el campo de estadio en las tarjetas afectadas cambia a **"Estadio no disponible"**.
> - Solo la petición de `/get/stadiums` entra en backoff exponencial; los partidos ya obtenidos de `/get/games` **no se vuelven a pedir**.

Este comportamiento implica que el render de tarjetas debe ser **incremental/parcial**: debe existir una función que actualice solo el campo de estadio de una tarjeta específica por su `stadium_id`/`game_id`, sin re-renderizar toda la lista.

---

## 6. Endpoints y modelo de cruce de datos

**Base URL:** `https://worldcup26.ir`

Los nombres de campo exactos, tipos de dato y casos borde de cada endpoint (`teams`, `games`, `stadiums`) están documentados en detalle en `context/api-reference.md` — consultarlo antes de escribir cualquier función de `/api`, en vez de asumir nombres de campo.

**Flujo de cruce de datos:**
1. `GET /get/teams` → poblar selector (48 equipos).
2. Usuario elige equipo → filtrar `GET /get/games` donde `home_team_id === team.id OR away_team_id === team.id`.
3. Ordenar partidos filtrados por `local_date` ascendente.
4. Por cada partido, cruzar `stadium_id` contra `GET /get/stadiums` → obtener `city_en`, país, `capacity`.
5. Renderizar itinerario de tarjetas (una por partido) con: nombre completo del rival (no código de 3 letras), fecha, nombre completo del estadio, ciudad + país (línea separada, texto explícito), aforo.
6. Calcular `count(distinct city_en)` sobre los partidos encontrados y mostrarlo.

**Importante — condiciones de carrera:** las peticiones a `/get/teams`, `/get/games` y `/get/stadiums` pueden completarse en cualquier orden. El código debe garantizar el resultado correcto sin importar el orden de llegada (ej. no asumir que `teams` siempre resuelve antes que `games`).

### 6.1 Navegación de la app

Navbar **actual** (versión a construir ahora):

| Elemento | Contenido | Endpoints |
|---|---|---|
| **Logo WC26** | Archivo `.png` estático (`<img>`), insertado cuando el usuario lo provea — mientras tanto, placeholder simple (no generar ni replicar el logo de FIFA) | — |
| **Itinerarios** | Única sección funcional: selector de equipo + tarjetas de itinerario + contador de ciudades | `/get/teams`, `/get/games`, `/get/stadiums` |
| **Ícono de campana** (opcional) | Historial de eventos de resiliencia recientes (429, offline) — complementa, no reemplaza los chips en tiempo real | ninguno adicional |
| **Ícono de cuenta** | Dropdown con nombre/email del `user` (obtenido en el login) + chip "Sesión activa" + botón "Cerrar sesión". **Nunca mostrar términos técnicos** (JWT, Bearer token, etc.) en este dropdown — son detalles de implementación, no información para el usuario final | ninguno adicional — usa datos ya en memoria |

**"Partidos" (calendario completo) queda pausado / a futuro.** No aparece en el enunciado, no es parte del alcance evaluado. Está documentado como RF-05b (opcional) en `requirements.md` solo como referencia por si se retoma después de que todo lo obligatorio esté sólido. **No construirlo ahora** — no agregar el ítem a la navbar ni el componente `matchesView.js` hasta indicación explícita.

**No agregar una sección "Standings"** (tabla de posiciones): requeriría `GET /get/groups`, que pertenece a otro subproyecto de la Categoría A ("El Muro") y está fuera del alcance evaluado aquí. Si se sugiere, redirigir a Itinerarios.

> **Regla obligatoria — countdown/offline en tiempo real:** el countdown de 429 (RF-09) y el indicador de datos cacheados (RF-10) deben aparecer automáticamente en pantalla (chip/banner flotante) apenas ocurre el estado, **sin requerir que el usuario abra nada**. No implementarlos únicamente detrás del ícono de campana — eso no cumple el requisito de "visible" del enunciado y es un riesgo directo en la defensa oral.

---

## 7. Convenciones de código

- Nombrado de funciones en inglés, comentarios y mensajes de UI en español (idioma del curso/defensa).
- Cada función exportada de `/api` debe tener un comentario breve explicando qué hace y qué errores puede lanzar.
- Evitar "código mágico" generado sin explicación: cada bloque no trivial (especialmente backoff, manejo de 401, cruce de datos) debe tener comentarios que permitan al estudiante explicarlo en la defensa oral.
- Preferir funciones puras y pequeñas sobre funciones largas que mezclen fetch + lógica + DOM.
- Nombres de variables descriptivos relacionados al dominio (`selectedTeamId`, `stadiumsById`, `retryCount`), no genéricos (`data`, `temp`, `x`).

---

## 8. Qué NO hacer al generar código

- No propongas instalar paquetes npm de runtime para JS (solo Tailwind vía su CLI/build es aceptable).
- No uses `.then()` "solo para esta parte" — siempre `async/await` + `try/catch`.
- No uses `alert()`/`confirm()` como solución rápida para mostrar errores o confirmaciones.
- No resuelvas el 401 recargando la página.
- No mezcles lógica de fetch dentro de funciones de renderizado del DOM.
- No re-renderices toda la lista de tarjetas cuando solo cambia un campo de una tarjeta (rompe el reto de resiliencia de la sección 5.5).
- No generes código que el estudiante no pueda explicar: prioriza claridad sobre "cleverness".

---

## 9. Criterio de éxito funcional (checklist rápido)

- [ ] Pantalla de login (email/password) como puerta de entrada si no hay token válido.
- [ ] Login llama a `POST /auth/authenticate`; modal de 401 reutiliza el mismo componente.
- [ ] Navbar con logo WC26 (placeholder) | Itinerarios | 🔔 opcional | ícono de cuenta (sin "Partidos" por ahora).
- [ ] Íconos Lucide usados como SVG inline copiado (no el paquete npm ni el script CDN de Lucide).
- [ ] Dropdown de cuenta sin jerga técnica visible (nada de "JWT"/"Bearer token").
- [ ] Selector con 48 equipos desde `/get/teams`.
- [ ] Filtro de partidos por equipo (home o away), ordenado por `local_date`.
- [ ] Nombres completos de equipos en todas partes (ej. "México vs Polonia"), nunca códigos de 3 letras (ej. "MEX vs POL").
- [ ] Cruce con `/get/stadiums` mostrando: nombre completo del estadio, ciudad + país en línea separada (texto explícito, ej. "Monterrey, México"), y aforo. Nada de códigos/abreviaciones sin desplegar.
- [ ] Grupo del partido (`group`, de `/get/games`) mostrado en la tarjeta — no requiere `/get/groups`.
- [ ] Render como tarjetas de itinerario (no tabla).
- [ ] Contador de ciudades distintas visitadas.
- [ ] JWT en header `Authorization` en toda petición a `/get/*`.
- [ ] 100% `async/await`, cero `.then/.catch` en el repo.
- [ ] 401 → limpia token + modal de reautenticación (mismo form de login), sin reload.
- [ ] 429/500 → backoff exponencial por petición; countdown visible **en tiempo real, sin abrir nada**.
- [ ] Caché en `localStorage` + indicador de datos no actualizados **en tiempo real, sin abrir nada**.
- [ ] Fallo aislado de `/get/stadiums` no destruye tarjetas ya renderizadas.
- [ ] Cero `alert()` en todo el código.
- [ ] Separación clara `/api`, `/state`, `/ui`.
- [ ] Sin sección "Standings" ni llamadas a `/get/groups`.
