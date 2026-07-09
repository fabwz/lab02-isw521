// Estado de la app. Sección de auth: token/user viven en memoria (para
// lecturas rápidas durante la sesión) y se espejan en localStorage (para
// sobrevivir a un refresh de página). Ninguna función de este módulo toca el
// DOM ni hace fetch.

const STORAGE_KEY_TOKEN = 'auth:token';
const STORAGE_KEY_USER = 'auth:user';

let authToken = localStorage.getItem(STORAGE_KEY_TOKEN);
let authUser = JSON.parse(localStorage.getItem(STORAGE_KEY_USER) ?? 'null');

// setAuth: guarda token + user tras un login exitoso, en memoria y localStorage.
export const setAuth = (token, user) => {
  authToken = token;
  authUser = user;
  localStorage.setItem(STORAGE_KEY_TOKEN, token);
  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
};

// clearAuth: se usa al detectar un 401 (RF-08) o al cerrar sesión.
export const clearAuth = () => {
  authToken = null;
  authUser = null;
  localStorage.removeItem(STORAGE_KEY_TOKEN);
  localStorage.removeItem(STORAGE_KEY_USER);
};

export const getToken = () => authToken;
export const getUser = () => authUser;
export const isAuthenticated = () => Boolean(authToken);

// Caché por endpoint (RF-10): última respuesta exitosa de cada endpoint de
// datos (teams/games/stadiums), guardada junto a su timestamp para poder
// mostrar el indicador "Datos no actualizados · hh:mm" cuando se usa.
const cacheStorageKey = (endpointName) => `cache:${endpointName}`;

// setCachedData: se llama tras cada respuesta 200 de un endpoint de datos.
export const setCachedData = (endpointName, data) => {
  const entrada = { data, timestamp: Date.now() };
  localStorage.setItem(cacheStorageKey(endpointName), JSON.stringify(entrada));
};

// getCachedData: devuelve { data, timestamp } o null si nunca se guardó nada
// para ese endpoint. Se consulta solo cuando la petición en vivo falla.
export const getCachedData = (endpointName) => {
  const crudo = localStorage.getItem(cacheStorageKey(endpointName));
  if (!crudo) return null;
  return JSON.parse(crudo);
};
