// Wrapper único de fetch autenticado. Toda petición a un endpoint de datos
// (/get/*) debe pasar por aquí para garantizar el header Authorization y un
// manejo de errores HTTP consistente (401/429/500) en un solo lugar.

// En desarrollo (`npm run dev`), usamos la ruta relativa /wc26-api, que Vite
// redirige a https://worldcup26.ir server-to-server (ver vite.config.js) para
// evitar el bloqueo de CORS del navegador. En build de producción no hay
// servidor de Vite corriendo, así que se llama directo a la API real.
const API_BASE_URL = import.meta.env.DEV ? '/wc26-api' : 'https://worldcup26.ir';

// Sin esto, `fetch` no tiene timeout propio: si no hay conexión real (no solo
// "el servidor respondió mal", sino que el socket nunca llega a establecerse),
// el navegador puede tardar decenas de segundos o más en rechazar la promesa
// según la pila de red del SO — la app se quedaba "congelada" hasta que el
// usuario recargaba la página, que es justo cuando el intento fresco tenía
// más chance de fallar rápido. Con AbortController forzamos un límite propio.
const REQUEST_TIMEOUT_MS = 8000;

// ApiError: la API SÍ respondió, con un código de estado HTTP concreto.
// Permite a las capas superiores (domain/ui) distinguir 401/429/500 sin tener
// que parsear el objeto Response.
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// NetworkError: la petición NUNCA llegó a obtener una respuesta HTTP (sin
// conexión, DNS caído, timeout propio). No lleva `status` — es la señal para
// que utils/backoff.js NO intente reintentos de 429/500 (no aplican, no hubo
// respuesta que clasificar) y para que la capa de datos vaya directo al
// camino de caché/offline (RF-10).
export class NetworkError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'NetworkError';
    this.cause = cause;
  }
}

// fetchConTimeout: envuelve `fetch` para que un fallo de conexión real
// (TypeError "Failed to fetch") o un cuelgue de red (AbortError por nuestro
// propio timeout) se normalicen siempre como NetworkError, nunca como un
// error genérico sin clasificar ni como un ApiError con status inventado.
const fetchConTimeout = async (url, options) => {
  const controlador = new AbortController();
  const timeoutId = setTimeout(() => controlador.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...options, signal: controlador.signal });
  } catch (error) {
    // TypeError: sin conexión / DNS / CORS. AbortError: superó REQUEST_TIMEOUT_MS.
    // Ambos casos significan lo mismo para la app: no hubo respuesta del servidor.
    // TEMPORAL: log para confirmar en Console qué camino se está tomando de
    // verdad (retirar una vez validado en vivo).
    console.debug('[resiliencia] NetworkError — sin respuesta HTTP', { url, causaOriginal: error.name });
    throw new NetworkError('No se pudo conectar con el servidor', error);
  } finally {
    clearTimeout(timeoutId);
  }
};

// clasificarRespuesta: única fuente de verdad para traducir un status HTTP a
// ApiError. Se llama solo cuando SÍ hubo respuesta (fetchConTimeout ya filtró
// los fallos de red puros), así que aquí `respuesta.status` siempre es real.
const clasificarRespuesta = async (respuesta, mensajes) => {
  if (respuesta.status !== 200) {
    // TEMPORAL: log para confirmar en Console que el status viene de una
    // respuesta HTTP real (no de una NetworkError disfrazada) — retirar una
    // vez validado en vivo.
    console.debug('[resiliencia] ApiError — respuesta HTTP real', { url: respuesta.url, status: respuesta.status });
  }
  if (respuesta.status === 401) {
    throw new ApiError(401, mensajes[401]);
  }
  if (respuesta.status === 429) {
    throw new ApiError(429, 'Límite de peticiones excedido');
  }
  if (respuesta.status >= 500) {
    throw new ApiError(respuesta.status, 'Error del servidor');
  }
  if (!respuesta.ok) {
    throw new ApiError(respuesta.status, mensajes.default);
  }
  return await respuesta.json();
};

// authFetch: agrega el header Authorization: Bearer <token>. Lanza NetworkError
// si no hubo respuesta (sin conexión/timeout) o ApiError tipado según el
// código de estado si sí la hubo. No hace reintentos (eso es responsabilidad
// de utils/backoff.js, que solo reintenta ante ApiError 429/5xx) ni sabe nada
// de UI/DOM.
export const authFetch = async (path, token) => {
  const respuesta = await fetchConTimeout(`${API_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return clasificarRespuesta(respuesta, {
    401: 'Sesión expirada o token inválido',
    default: 'Error al consultar la API',
  });
};

// publicFetch: para los endpoints /auth/*, que no llevan Authorization header
// (son los que generan el token). Mismo manejo explícito de NetworkError vs
// 401/429/500.
export const publicFetch = async (path, body) => {
  const respuesta = await fetchConTimeout(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  return clasificarRespuesta(respuesta, {
    401: 'Credenciales inválidas',
    default: 'Error de autenticación',
  });
};
