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

// Todo el texto de la app usa rem, así que esta variable CSS escala toda la tipografía a la vez.
export const applyFontScaleLevel = (nivel) => {
  const factor = SCALE_BY_LEVEL[nivel] ?? SCALE_BY_LEVEL.normal;
  document.documentElement.style.setProperty('--user-font-scale', factor);
};

export const setFontScaleLevel = (nivel) => {
  localStorage.setItem(FONT_SCALE_STORAGE_KEY, nivel);
  applyFontScaleLevel(nivel);
};

export const initFontScale = () => {
  applyFontScaleLevel(getStoredFontScaleLevel());
};
