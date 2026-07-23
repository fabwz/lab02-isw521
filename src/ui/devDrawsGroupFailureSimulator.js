// SOLO DESARROLLO. RF-RE-R: fuerza un 429 sobre el siguiente grupo pendiente de la matriz.
export const mountDevDrawsGroupFailureSimulator = (trigger, container) => {
  if (!import.meta.env.DEV) return;

  const boton = document.createElement('button');
  boton.type = 'button';
  boton.textContent = '2.5 Radar de Empates — Simular 429 a mitad de matriz (dev)';
  boton.title = 'Atajo: Ctrl+Shift+Q — fuerza 429 a mitad de la matriz mientras se pinta grupo por grupo; RF-RE-R';
  boton.className = container
    ? 'w-full text-left glass rounded-lg px-4 py-2 body-sm text-signal border border-signal/40 ' +
      'hover:bg-signal/10 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2'
    : 'fixed bottom-90 right-4 z-50 glass rounded-full px-4 py-2 body-sm text-signal border border-signal/40 ' +
      'hover:bg-signal/10 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2';
  boton.addEventListener('click', trigger);
  (container ?? document.body).appendChild(boton);

  document.addEventListener('keydown', (evento) => {
    const esAtajo = evento.ctrlKey && evento.shiftKey && evento.key.toLowerCase() === 'q';
    if (esAtajo) trigger();
  });
};
