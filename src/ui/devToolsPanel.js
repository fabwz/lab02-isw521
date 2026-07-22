// SOLO DESARROLLO. Agrupa los simuladores en un botón flotante único.
// Mapa de atajos Ctrl+Shift+<tecla> — mantener esta lista al día al agregar un simulador nuevo,
// cada mount*Simulator registra su propio listener de keydown y NO valida colisiones entre sí:
//   E → 401 (sesión expirada)              S → 500 (servidor)
//   Q → RF-RE-R 429 a mitad de matriz (2.5 Radar de Empates) — NO se usó "M" (Matriz) a
//       propósito: El Muro (2.3) también empieza con M y hubiera chocado con Q más adelante.
//   W → RF-EM-R fallo próximo rival de 1 de 5 equipos (2.3 El Muro, de "Wall") — se evitó "M"
//       por la razón de arriba.
// (429 agota/recupera, RF-11 estadios, RF-RG-R equipos y RF-AE-R partidos se retiraron:
// requirements.md sección 17 los confirmó 100% reproducibles manualmente vía DevTools.)
import { mountDevSessionSimulator } from './devSessionSimulator.js';
import { mountDevServerErrorSimulator } from './devServerErrorSimulator.js';
import { mountDevDrawsGroupFailureSimulator } from './devDrawsGroupFailureSimulator.js';
import { mountDevWallFailureSimulator } from './devWallFailureSimulator.js';

export const mountDevToolsPanel = ({
  trigger401,
  trigger500,
  triggerFallo429Matriz,
  triggerFalloRivalMuro,
}) => {
  if (!import.meta.env.DEV) return;

  const boton = document.createElement('button');
  boton.type = 'button';
  // Ícono "settings" de Lucide, SVG inline estático (CLAUDE.md 2).
  boton.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" ' +
    'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>' +
    '<circle cx="12" cy="12" r="3"/>' +
    '</svg>';
  boton.title = 'Herramientas de simulación (dev)';
  boton.setAttribute('aria-haspopup', 'true');
  boton.setAttribute('aria-expanded', 'false');
  boton.className =
    'fixed bottom-4 right-4 z-50 glass rounded-full w-11 h-11 flex items-center justify-center text-white/80 ' +
    'hover:bg-white/10 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2';

  const panel = document.createElement('div');
  panel.className =
    'fixed bottom-16 right-4 z-50 glass rounded-xl p-3 flex flex-col gap-2 w-64 max-h-[70vh] overflow-y-auto hidden';
  panel.setAttribute('role', 'menu');

  const titulo = document.createElement('p');
  titulo.textContent = 'Simuladores (dev)';
  titulo.className = 'body-sm text-white/60 px-1 pb-1';
  panel.appendChild(titulo);

  document.body.appendChild(panel);
  document.body.appendChild(boton);

  const abrirPanel = () => {
    panel.classList.remove('hidden');
    boton.setAttribute('aria-expanded', 'true');
  };

  const cerrarPanel = () => {
    panel.classList.add('hidden');
    boton.setAttribute('aria-expanded', 'false');
  };

  const estaAbierto = () => !panel.classList.contains('hidden');

  boton.addEventListener('click', (evento) => {
    evento.stopPropagation();
    if (estaAbierto()) {
      cerrarPanel();
    } else {
      abrirPanel();
    }
  });

  document.addEventListener('click', (evento) => {
    if (!estaAbierto()) return;
    if (panel.contains(evento.target) || boton.contains(evento.target)) return;
    cerrarPanel();
  });

  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape' && estaAbierto()) cerrarPanel();
  });

  mountDevSessionSimulator(trigger401, panel);
  mountDevServerErrorSimulator(trigger500, panel);

  // Retos de resiliencia específicos de cada subproyecto (sección 5.5/6.2 de CLAUDE.md):
  // separados visualmente de los simuladores genéricos de arriba. Solo quedan El Muro
  // (RF-EM-R) y Radar de Empates (RF-RE-R) — son los únicos que el profesor autorizó
  // conservar como excepción en requirements.md sección 17, por no ser reproducibles
  // manualmente vía DevTools.
  const separador = document.createElement('div');
  separador.className = 'border-t border-white/[0.12] my-1';
  panel.appendChild(separador);

  const tituloRetos = document.createElement('p');
  tituloRetos.textContent = 'Retos de resiliencia por subproyecto';
  tituloRetos.className = 'body-sm text-white/60 px-1 pb-1';
  panel.appendChild(tituloRetos);

  mountDevWallFailureSimulator(triggerFalloRivalMuro, panel);
  mountDevDrawsGroupFailureSimulator(triggerFallo429Matriz, panel);
};
