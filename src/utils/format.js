// Defensa XSS (requirements.md 16) para texto de la API interpolado en innerHTML.
const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export const escapeHtml = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (caracter) => HTML_ESCAPE_MAP[caracter]);
};

// En fase eliminatoria, el campo `group` de /get/games deja de ser una letra (A..L) y pasa a ser un código de ronda.
const ROUND_LABELS = {
  R32: 'Ronda de 32',
  R16: 'Ronda de 16',
  QF: 'Cuartos de Final',
  SF: 'Semifinal',
  '3RD': 'Tercer Puesto',
  FINAL: 'Final',
};

export const formatGroupLabel = (group) => {
  return ROUND_LABELS[group] ?? `Grupo ${escapeHtml(group)}`;
};

export const animateCountUp = (element, targetValue, { duration = 500 } = {}) => {
  if (!element) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion || !(targetValue > 0)) {
    element.textContent = targetValue.toLocaleString('es-CR');
    return;
  }

  const inicioMs = performance.now();
  const pintarCuadro = (ahoraMs) => {
    const progreso = Math.min((ahoraMs - inicioMs) / duration, 1);
    element.textContent = Math.round(targetValue * progreso).toLocaleString('es-CR');
    if (progreso < 1) requestAnimationFrame(pintarCuadro);
  };
  requestAnimationFrame(pintarCuadro);
};
