import { FONT_SCALE_LEVELS, getStoredFontScaleLevel, setFontScaleLevel } from '../utils/fontScale.js';
import { LANGUAGES, getStoredLanguage, setLanguage, t } from '../utils/i18n.js';

const LABEL_BY_LEVEL = {
  reducido: 'A-',
  normal: 'A',
  aumentado: 'A+',
};

const LABEL_BY_LANGUAGE = {
  es: 'ES',
  en: 'EN',
};

export const renderAccessibilityPanel = (container) => {
  const nivelActivo = getStoredFontScaleLevel();
  const idiomaActivo = getStoredLanguage();

  container.innerHTML = `
    <div class="flex flex-col gap-3">
      <p class="body-sm text-text-secondary">${t('a11y.sectionTitle')}</p>
      <div class="flex items-center gap-2" role="group" aria-label="${t('a11y.textSizeLabel')}">
        ${FONT_SCALE_LEVELS.map((nivel) => `
          <button
            type="button"
            data-font-scale-level="${nivel}"
            aria-pressed="${nivel === nivelActivo}"
            class="font-scale-option glass rounded-lg px-3 py-1.5 body-sm text-white transition hover:bg-white/[0.09] focus-visible:outline focus-visible:outline-2 focus-visible:outline-magenta focus-visible:outline-offset-2 ${nivel === nivelActivo ? 'bg-white/[0.14]' : ''}"
          >${LABEL_BY_LEVEL[nivel]}</button>
        `).join('')}
      </div>
      <div class="flex items-center gap-2" role="group" aria-label="${t('a11y.languageLabel')}">
        ${LANGUAGES.map((idioma) => `
          <button
            type="button"
            data-language="${idioma}"
            aria-pressed="${idioma === idiomaActivo}"
            class="language-option glass rounded-lg px-3 py-1.5 body-sm text-white transition hover:bg-white/[0.09] focus-visible:outline focus-visible:outline-2 focus-visible:outline-magenta focus-visible:outline-offset-2 ${idioma === idiomaActivo ? 'bg-white/[0.14]' : ''}"
          >${LABEL_BY_LANGUAGE[idioma]}</button>
        `).join('')}
      </div>
    </div>
  `;

  const botonesTamano = container.querySelectorAll('.font-scale-option');
  botonesTamano.forEach((boton) => {
    boton.addEventListener('click', () => {
      const nivel = boton.dataset.fontScaleLevel;
      setFontScaleLevel(nivel);
      botonesTamano.forEach((otro) => {
        const activo = otro === boton;
        otro.setAttribute('aria-pressed', String(activo));
        otro.classList.toggle('bg-white/[0.14]', activo);
      });
    });
  });

  const botonesIdioma = container.querySelectorAll('.language-option');
  botonesIdioma.forEach((boton) => {
    boton.addEventListener('click', () => {
      const idioma = boton.dataset.language;
      if (idioma === getStoredLanguage()) return;
      setLanguage(idioma);
    });
  });
};
