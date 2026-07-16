// SOLO DESARROLLO. Fuerza que la búsqueda de próximo rival de UNO de los 5 equipos del
// ranking de El Muro falle (RF-EM-R), sin afectar a los otros 4.
export const mountDevWallFailureSimulator = (trigger, container) => {
  if (!import.meta.env.DEV) return;

  const boton = document.createElement('button');
  boton.type = 'button';
  boton.textContent = '2.3 El Muro — Simular fallo próximo rival (dev)';
  boton.title = 'Atajo: Ctrl+Shift+W — falla la búsqueda de próximo rival de 1 de los 5 equipos en El Muro; RF-EM-R';
  boton.className = container
    ? 'w-full text-left glass rounded-lg px-4 py-2 body-sm text-signal border border-signal/40 ' +
      'hover:bg-signal/10 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2'
    : 'fixed bottom-64 right-4 z-50 glass rounded-full px-4 py-2 body-sm text-signal border border-signal/40 ' +
      'hover:bg-signal/10 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2';
  boton.addEventListener('click', trigger);
  (container ?? document.body).appendChild(boton);

  document.addEventListener('keydown', (evento) => {
    const esAtajo = evento.ctrlKey && evento.shiftKey && evento.key.toLowerCase() === 'w';
    if (esAtajo) trigger();
  });
};
