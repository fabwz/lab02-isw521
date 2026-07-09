// fetchWithBackoff: reintenta automáticamente una petición ante 429/500 con
// espera creciente (RF-09): 1s -> 2s -> 4s -> 8s. No sabe nada de DOM/UI; solo
// invoca los callbacks que le pasen (onRetry en cada intento fallido, onTick
// cada segundo mientras espera, para alimentar un countdown en pantalla).
const DELAYS_MS = [1000, 2000, 4000, 8000];

// espera: resuelve tras `delayMs`, llamando a onTick(segundosRestantes) cada
// segundo. Permite que la UI muestre un countdown en tiempo real (RF-09).
const espera = (delayMs, onTick) => {
  return new Promise((resolve) => {
    let restanteMs = delayMs;
    onTick?.(Math.ceil(restanteMs / 1000));

    const intervalo = setInterval(() => {
      restanteMs -= 1000;
      if (restanteMs <= 0) {
        clearInterval(intervalo);
        onTick?.(0);
        resolve();
        return;
      }
      onTick?.(Math.ceil(restanteMs / 1000));
    }, 1000);
  });
};

// esRetriable: solo 429 (rate limit) y 5xx (servidor) disparan backoff. 401 y
// el resto de errores se propagan de inmediato (los maneja RF-08 u otra capa).
const esRetriable = (error) => error?.status === 429 || error?.status >= 500;

// fetchWithBackoff: ejecuta `requestFn` (debe devolver una Promise, típicamente
// una llamada a authFetch) y reintenta hasta agotar DELAYS_MS si el error es
// retriable. onRetry({ status, attempt, delayMs }) se dispara antes de cada
// espera, para que la capa de UI muestre el banner correcto (429 vs 500).
// onTick(segundosRestantes) se reenvía a `espera` para el countdown visible.
export const fetchWithBackoff = async (requestFn, { onRetry, onTick } = {}) => {
  let intento = 0;

  while (true) {
    try {
      return await requestFn();
    } catch (error) {
      // TEMPORAL: confirma en Console si el error es retriable (ApiError
      // 429/5xx) o si se propaga de inmediato (NetworkError, 401, etc.) —
      // retirar una vez validado en vivo.
      console.debug('[resiliencia] fetchWithBackoff — error recibido', {
        nombre: error.name,
        status: error.status,
        esRetriable: esRetriable(error),
        intento,
      });

      if (!esRetriable(error) || intento >= DELAYS_MS.length) {
        throw error;
      }

      const delayMs = DELAYS_MS[intento];
      intento += 1;
      onRetry?.({ status: error.status, attempt: intento, delayMs });
      await espera(delayMs, onTick);
    }
  }
};
