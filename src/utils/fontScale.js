// RF-A11Y-03: escala global de tamaño de texto (A- / A / A+). Pura (sin DOM más allá de
// document.documentElement, sin fetch) — usada tanto por main.js (aplicar al cargar, antes
// de renderizar nada) como por ui/accessibilityPanel.js (botones dentro del dropdown de cuenta).
export const FONT_SCALE_STORAGE_KEY = 'a11y:fontScale';

export const FONT_SCALE_LEVELS = ['reducido', 'normal', 'aumentado'];

const SCALE_BY_LEVEL = {
  reducido: 0.875,
  normal: 1,
  aumentado: 1.15,
};

export const getStoredFontScaleLevel = () => {
  const nivelGuardado = localStorage.getItem(FONT_SCALE_STORAGE_KEY);
  return FONT_SCALE_LEVELS.includes(nivelGuardado) ? nivelGuardado : 'normal';
};

// Escribe la variable CSS raíz que controla el font-size de <html> (ver input.css). Todo el
// texto de la app usa rem, así que esta única variable escala proporcionalmente toda la
// tipografía sin tocar tamaños individuales por componente.
export const applyFontScaleLevel = (nivel) => {
  const factor = SCALE_BY_LEVEL[nivel] ?? SCALE_BY_LEVEL.normal;
  document.documentElement.style.setProperty('--user-font-scale', factor);
};

export const setFontScaleLevel = (nivel) => {
  localStorage.setItem(FONT_SCALE_STORAGE_KEY, nivel);
  applyFontScaleLevel(nivel);
};

// Llamado desde main.js antes de renderizar cualquier vista, para que no haya parpadeo
// visible de "normal" a "ajustado" al recargar la página con una preferencia ya guardada.
export const initFontScale = () => {
  applyFontScaleLevel(getStoredFontScaleLevel());
};
