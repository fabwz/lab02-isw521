import { authFetch, ApiError, fetchSimulatedError, fetchSimulatedSuccess } from './httpClient.js';
import { getToken, setCachedData, getCachedData } from '../state/appState.js';
import { fetchWithBackoff } from '../utils/backoff.js';

const conBackoffVisible = (source, peticion, banners) => {
  let ultimoStatus = null;

  return fetchWithBackoff(peticion, {
    onRetry: ({ status, delayMs }) => {
      ultimoStatus = status;
      if (status === 429) {
        banners.showRateLimitBanner(source, Math.ceil(delayMs / 1000));
      } else {
        banners.showServerErrorBanner(source, delayMs);
      }
    },
    onTick: (segundosRestantes) => {
      if (ultimoStatus === 429 && segundosRestantes > 0) {
        banners.showRateLimitBanner(source, segundosRestantes);
      }
    },
  });
};

const fetchDatasetResiliente = async (cacheKey, path, responseKey, banners) => {
  try {
    const respuesta = await conBackoffVisible(cacheKey, () => authFetch(path, getToken()), banners);
    banners.hideRateLimitBanner(cacheKey);
    banners.hideServerErrorBanner(cacheKey);
    banners.hideCacheBanner(cacheKey);
    const dataset = respuesta[responseKey];
    setCachedData(cacheKey, dataset);
    console.debug('[resiliencia] fetchDatasetResiliente — éxito', { cacheKey });
    return dataset;
  } catch (error) {
    banners.hideRateLimitBanner(cacheKey);
    banners.hideServerErrorBanner(cacheKey);

    if (error instanceof ApiError && error.status === 401) {
      throw error;
    }

    const cache = getCachedData(cacheKey);
    if (cache) {
      console.debug('[resiliencia] fetchDatasetResiliente — usando caché', { cacheKey, timestamp: cache.timestamp });
      banners.showCacheBanner(cacheKey, cache.timestamp);
      return cache.data;
    }

    console.debug('[resiliencia] fetchDatasetResiliente — sin caché disponible, se propaga el error', { cacheKey });
    throw error;
  }
};

// GET /get/teams — array de 48 equipos.
export const getTeams = async (banners) => fetchDatasetResiliente('teams', '/get/teams', 'teams', banners);

// GET /get/games — array de 104 partidos.
export const getGames = async (banners) => fetchDatasetResiliente('games', '/get/games', 'games', banners);

// GET /get/stadiums — array de 16 estadios. capacity llega como número, no string.
export const getStadiums = async (banners) => fetchDatasetResiliente('stadiums', '/get/stadiums', 'stadiums', banners);

// SOLO DESARROLLO. Usa fetch real a /dev-mock/<status> para que el backoff/countdown corra el código de producción.
const simulateApiError = async (status, datasetCacheKey, banners, { failCount = Infinity } = {}) => {
  if (!import.meta.env.DEV) return;

  const bannerSource = `dev-sim:${status}:${datasetCacheKey}`;

  let intentosHechos = 0;
  const peticionFalsa = async () => {
    intentosHechos += 1;
    if (intentosHechos <= failCount) {
      return await fetchSimulatedError(status);
    }
    return await fetchSimulatedSuccess();
  };

  try {
    await conBackoffVisible(bannerSource, peticionFalsa, banners);
    banners.hideRateLimitBanner(bannerSource);
    banners.hideServerErrorBanner(bannerSource);
    console.debug(`[resiliencia][DEV] simulación de ${status} se recuperó`, {
      bannerSource,
      fallosAntesDeRecuperar: intentosHechos - 1,
    });
  } catch (error) {
    banners.hideRateLimitBanner(bannerSource);
    banners.hideServerErrorBanner(bannerSource);
    console.debug(`[resiliencia][DEV] simulación de ${status} agotó reintentos`, {
      bannerSource,
      nombre: error.name,
      status: error.status,
    });

    const cache = getCachedData(datasetCacheKey);
    if (cache) {
      banners.showCacheBanner(bannerSource, cache.timestamp);
    }
  }
};

// SOLO DESARROLLO.
export const simulateServerError = (cacheKey = 'teams', banners) => simulateApiError(500, cacheKey, banners);

// SOLO DESARROLLO. RF-RE-R: simula un 429 puntual sobre el grupo pendiente del Radar de Empates.
export const simulateDrawsGroupRateLimit = async (groupLetter, banners, { failCount = 1 } = {}) => {
  if (!import.meta.env.DEV) return;

  const source = `draws-group:${groupLetter}`;
  let intentosHechos = 0;
  const peticionFalsa = async () => {
    intentosHechos += 1;
    if (intentosHechos <= failCount) {
      return await fetchSimulatedError(429);
    }
    return await fetchSimulatedSuccess();
  };

  try {
    await conBackoffVisible(source, peticionFalsa, banners);
    console.debug('[resiliencia][DEV] simulación RF-RE-R — grupo pendiente se recuperó', { groupLetter, intentosHechos });
  } finally {
    banners.hideRateLimitBanner(source);
    banners.hideServerErrorBanner(source);
  }
};

// SOLO DESARROLLO.
export const simulateSessionExpired = async () => {
  if (!import.meta.env.DEV) return;
  try {
    await fetchSimulatedError(401);
  } catch (error) {
    console.debug('[resiliencia][DEV] simulación de 401 clasificada desde respuesta real', {
      nombre: error.name,
      status: error.status,
    });
  }
};
