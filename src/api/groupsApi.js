import { authFetch, ApiError } from './httpClient.js';
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

// GET /get/groups — respuesta envuelta en { groups: [...] }, ver api-reference.md.
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
