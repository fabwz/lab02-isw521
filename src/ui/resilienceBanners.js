// resilienceBanners: chips/banners glass que aparecen AUTOMÁTICAMENTE en
// pantalla para los 3 estados de resiliencia (RF-09/RF-10) — countdown de
// 429, barra de progreso de 500 y badge de datos en caché (offline). Ninguno
// requiere que el usuario abra algo para verlos (DESIGN.md sección 5).
// Solo DOM: no sabe nada de fetch/backoff, solo cómo dibujarse y actualizarse.

// Los 3 datasets (teams/games/stadiums) se piden en paralelo (RNF-03) y cada
// uno corre su propio backoff de forma independiente. Si el chip fuera un
// simple mostrar/ocultar global, el `hide` de una petición que ya terminó
// (éxito o caché) podía borrar el chip de OTRA que seguía reintentando —
// exactamente la condición de carrera reportada (banners que aparecen y
// desaparecen solos a mitad de ciclo). Por eso cada show/hide recibe un
// `source` (el cacheKey del dataset: 'teams' | 'games' | 'stadiums') y el
// chip solo se retira del DOM cuando NINGÚN source activo lo sigue necesitando.

// contenedorBanners: stack fijo bajo la navbar, esquina superior derecha,
// donde viven los 3 chips. Se crea una sola vez y se reutiliza.
let contenedorBanners = null;
const getContenedor = () => {
  if (contenedorBanners) return contenedorBanners;
  contenedorBanners = document.createElement('div');
  contenedorBanners.id = 'resilience-banners';
  contenedorBanners.className = 'fixed top-20 right-4 z-40 flex flex-col gap-3 items-end';
  document.body.appendChild(contenedorBanners);
  return contenedorBanners;
};

// ---------------------------------------------------------------------------
// Countdown 429 (límite de tasa) — número en mono-lg, se actualiza cada
// segundo con el valor que reporta fetchWithBackoff, y desaparece solo al
// resolverse el reintento (RF-09).
let chip429 = null;
const segundosPorSource429 = new Map(); // source -> segundos restantes

export const showRateLimitBanner = (source, segundosRestantes) => {
  segundosPorSource429.set(source, segundosRestantes);
  console.debug('[resiliencia] showRateLimitBanner', { source, segundosRestantes, activos: [...segundosPorSource429.keys()] });

  if (!chip429) {
    chip429 = document.createElement('div');
    chip429.className = 'glass rounded-2xl px-4 py-3 flex items-center gap-3 banner-enter';
    chip429.innerHTML = `
      <span class="font-mono text-[28px] leading-[32px] font-medium text-signal" data-role="seconds"></span>
      <span class="body-sm text-text-secondary leading-tight">Límite de tasa<br />reintentando en</span>
    `;
    getContenedor().appendChild(chip429);
  }
  // Si hay más de un dataset reintentando por 429 a la vez, mostramos el
  // peor caso (el que tarda más en resolver) para no parpadear entre valores.
  const peorCaso = Math.max(...segundosPorSource429.values());
  chip429.querySelector('[data-role="seconds"]').textContent = `${peorCaso}s`;
};

export const hideRateLimitBanner = (source) => {
  segundosPorSource429.delete(source);
  console.debug('[resiliencia] hideRateLimitBanner', { source, activosRestantes: [...segundosPorSource429.keys()] });
  if (segundosPorSource429.size === 0) {
    chip429?.remove();
    chip429 = null;
  }
};

// ---------------------------------------------------------------------------
// Backoff en curso 500 (error de servidor) — barra de progreso lineal que
// recorre el ancho del chip durante `delayMs`, misma aparición automática que
// el countdown (RF-09).
let chip500 = null;
const sourcesActivas500 = new Set();

export const showServerErrorBanner = (source, delayMs) => {
  sourcesActivas500.add(source);
  console.debug('[resiliencia] showServerErrorBanner', { source, delayMs, activos: [...sourcesActivas500] });

  if (!chip500) {
    chip500 = document.createElement('div');
    chip500.className = 'glass rounded-2xl px-4 py-3 flex flex-col gap-2 w-64 banner-enter';
    chip500.innerHTML = `
      <span class="body-sm text-text-secondary">Error de servidor · reintentando conexión...</span>
      <div class="h-1 w-full rounded-full bg-white/[0.08] overflow-hidden">
        <div data-role="bar" class="h-full rounded-full bg-gradient-to-r from-signal to-transparent"></div>
      </div>
    `;
    getContenedor().appendChild(chip500);
  }

  const barra = chip500.querySelector('[data-role="bar"]');
  // Reinicia la animación en cada intento: se fuerza un reflow para que el
  // navegador no "funda" la transición anterior con la nueva.
  barra.style.transition = 'none';
  barra.style.width = '0%';
  // eslint-disable-next-line no-unused-expressions
  barra.offsetWidth;
  barra.style.transition = `width ${delayMs}ms linear`;
  barra.style.width = '100%';
};

export const hideServerErrorBanner = (source) => {
  sourcesActivas500.delete(source);
  console.debug('[resiliencia] hideServerErrorBanner', { source, activosRestantes: [...sourcesActivas500] });
  if (sourcesActivas500.size === 0) {
    chip500?.remove();
    chip500 = null;
  }
};

// ---------------------------------------------------------------------------
// Indicador offline / caché — badge con punto parpadeante y hora del dato
// cacheado. Permanece visible mientras los datos en pantalla sigan siendo los
// del caché (RF-10); se oculta explícitamente cuando vuelve a haber datos
// frescos para ESE dataset en particular.
let chipCache = null;
const timestampsPorSourceCache = new Map(); // source -> timestamp del dato cacheado en uso

const formatHora = (timestampMs) => {
  const fecha = new Date(timestampMs);
  const horas = String(fecha.getHours()).padStart(2, '0');
  const minutos = String(fecha.getMinutes()).padStart(2, '0');
  return `${horas}:${minutos}`;
};

export const showCacheBanner = (source, timestampMs) => {
  timestampsPorSourceCache.set(source, timestampMs);
  console.debug('[resiliencia] showCacheBanner', { source, timestampMs, activos: [...timestampsPorSourceCache.keys()] });

  if (!chipCache) {
    chipCache = document.createElement('div');
    chipCache.className = 'glass rounded-full px-4 py-2 flex items-center gap-2 banner-enter';
    chipCache.innerHTML = `
      <span class="w-2 h-2 rounded-full bg-signal animate-pulse-slow shrink-0"></span>
      <span class="body-sm text-text-secondary">Datos no actualizados · <span data-role="time" class="font-mono"></span></span>
    `;
    getContenedor().appendChild(chipCache);
  }
  // Con varios datasets en caché a la vez, mostramos el más reciente de ellos.
  const masReciente = Math.max(...timestampsPorSourceCache.values());
  chipCache.querySelector('[data-role="time"]').textContent = formatHora(masReciente);
};

// hideCacheBanner: se llama cuando ESE dataset vuelve a tener datos frescos
// (petición en vivo exitosa) — solo retira el chip del DOM si ningún otro
// dataset sigue mostrando datos cacheados.
export const hideCacheBanner = (source) => {
  timestampsPorSourceCache.delete(source);
  console.debug('[resiliencia] hideCacheBanner', { source, activosRestantes: [...timestampsPorSourceCache.keys()] });
  if (timestampsPorSourceCache.size === 0) {
    chipCache?.remove();
    chipCache = null;
  }
};
