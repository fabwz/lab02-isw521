import { FONT_SCALE_LEVELS, getStoredFontScaleLevel, setFontScaleLevel } from '../utils/fontScale.js';

// RF-A11Y-03: sección "Accesibilidad" dentro del dropdown de cuenta (accountMenu.js) — no un
// botón flotante nuevo. Por ahora solo el control de tamaño de texto (A-/A/A+); el futuro
// toggle de idioma (RF-A11Y-01) vivirá aquí también, pero es independiente de este control.
const LABEL_BY_LEVEL = {
  reducido: 'A-',
  normal: 'A',
  aumentado: 'A+',
};

export const renderAccessibilityPanel = (container) => {
  const nivelActivo = getStoredFontScaleLevel();

  container.innerHTML = `
    <div class="flex flex-col gap-2">
      <p class="body-sm text-text-secondary">Accesibilidad</p>
      <div class="flex items-center gap-2" role="group" aria-label="Tamaño de texto">
        ${FONT_SCALE_LEVELS.map((nivel) => `
          <button
            type="button"
            data-font-scale-level="${nivel}"
            aria-pressed="${nivel === nivelActivo}"
            class="font-scale-option glass rounded-lg px-3 py-1.5 body-sm text-white transition hover:bg-white/[0.09] focus-visible:outline focus-visible:outline-2 focus-visible:outline-magenta focus-visible:outline-offset-2 ${nivel === nivelActivo ? 'bg-white/[0.14]' : ''}"
          >${LABEL_BY_LEVEL[nivel]}</button>
        `).join('')}
      </div>
    </div>
  `;

  const botones = container.querySelectorAll('.font-scale-option');
  botones.forEach((boton) => {
    boton.addEventListener('click', () => {
      const nivel = boton.dataset.fontScaleLevel;
      setFontScaleLevel(nivel);
      botones.forEach((otro) => {
        const activo = otro === boton;
        otro.setAttribute('aria-pressed', String(activo));
        otro.classList.toggle('bg-white/[0.14]', activo);
      });
    });
  });
};
