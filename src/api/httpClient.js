// Wrapper único de fetch autenticado. Toda petición a un endpoint de datos
// (/get/*) debe pasar por aquí para garantizar el header Authorization y un
// manejo de errores HTTP consistente (401/429/500) en un solo lugar.

// En desarrollo (`npm run dev`), usamos la ruta relativa /wc26-api, que Vite
// redirige a https://worldcup26.ir server-to-server (ver vite.config.js) para
// evitar el bloqueo de CORS del navegador. En build de producción no hay
// servidor de Vite corriendo, así que se llama directo a la API real.
const API_BASE_URL = import.meta.env.DEV ? '/wc26-api' : 'https://worldcup26.ir';

// Error tipado: permite a las capas superiores (domain/ui) distinguir el
// código de estado sin tener que parsear el objeto Response.
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// authFetch: agrega el header Authorization: Bearer <token> y lanza ApiError
// tipado según el código de estado. No hace reintentos (eso es responsabilidad
// de utils/backoff.js) ni sabe nada de UI/DOM.
export const authFetch = async (path, token) => {
  const respuesta = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (respuesta.status === 401) {
    throw new ApiError(401, 'Sesión expirada o token inválido');
  }
  if (respuesta.status === 429) {
    throw new ApiError(429, 'Límite de peticiones excedido');
  }
  if (respuesta.status >= 500) {
    throw new ApiError(respuesta.status, 'Error del servidor');
  }
  if (!respuesta.ok) {
    throw new ApiError(respuesta.status, 'Error al consultar la API');
  }

  return await respuesta.json();
};

// publicFetch: para los endpoints /auth/*, que no llevan Authorization header
// (son los que generan el token). Mismo manejo explícito de 401/429/500.
export const publicFetch = async (path, body) => {
  const respuesta = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (respuesta.status === 401) {
    throw new ApiError(401, 'Credenciales inválidas');
  }
  if (respuesta.status === 429) {
    throw new ApiError(429, 'Límite de peticiones excedido');
  }
  if (respuesta.status >= 500) {
    throw new ApiError(respuesta.status, 'Error del servidor');
  }
  if (!respuesta.ok) {
    throw new ApiError(respuesta.status, 'Error de autenticación');
  }

  return await respuesta.json();
};
