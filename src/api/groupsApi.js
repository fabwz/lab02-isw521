import { authFetch, ApiError } from './httpClient.js';
import { getToken, setCachedData, getCachedData } from '../state/appState.js';
import { fetchWithBackoff } from '../utils/backoff.js';

// Mismo patrón que worldCupApi.js (RF-EM-01 a 04): backoff visible + caché por dataset.
// `banners`: callbacks de ui/resilienceBanners.js inyectados por main.js.
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

// getGroups: GET /get/groups — a diferencia de teams/games/stadiums, la respuesta viene
// envuelta en { groups: [...] } en vez de un array directo (ver api-reference.md), por eso
// no se reutiliza fetchDatasetResiliente de worldCupApi.js tal cual: aquí se extrae el
// array antes de cachearlo/devolverlo.
export const getGroups = async (banners) => {
  const cacheKey = 'groups';
  try {
    const respuesta = await conBackoffVisible(cacheKey, () => authFetch('/get/groups', getToken()), banners);
    banners.hideRateLimitBanner(cacheKey);
    banners.hideServerErrorBanner(cacheKey);
    banners.hideCacheBanner(cacheKey);
    const groups = respuesta.groups;
    setCachedData(cacheKey, groups);
    return groups;
  } catch (error) {
    banners.hideRateLimitBanner(cacheKey);
    banners.hideServerErrorBanner(cacheKey);

    if (error instanceof ApiError && error.status === 401) {
      throw error;
    }

    const cache = getCachedData(cacheKey);
    if (cache) {
      banners.showCacheBanner(cacheKey, cache.timestamp);
      return cache.data;
    }

    throw error;
  }
};
