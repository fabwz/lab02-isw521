// SOLO DESARROLLO. Fuerza que solo /get/teams falle en el Rastreador de Goleadas,
// con /get/games ya resuelto (RF-RG-R).
export const mountDevTeamsFailureSimulator = (trigger, container) => {
  if (!import.meta.env.DEV) return;

  const boton = document.createElement('button');
  boton.type = 'button';
  boton.textContent = '2.2 Goleadas — Simular fallo equipos (dev)';
  boton.title = 'Atajo: Ctrl+Shift+G — falla solo /get/teams en Rastreador de Goleadas; RF-RG-R';
  boton.className = container
    ? 'w-full text-left glass rounded-lg px-4 py-2 body-sm text-signal border border-signal/40 ' +
      'hover:bg-signal/10 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2'
    : 'fixed bottom-64 right-4 z-50 glass rounded-full px-4 py-2 body-sm text-signal border border-signal/40 ' +
      'hover:bg-signal/10 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2';
  boton.addEventListener('click', trigger);
  (container ?? document.body).appendChild(boton);

  document.addEventListener('keydown', (evento) => {
    const esAtajo = evento.ctrlKey && evento.shiftKey && evento.key.toLowerCase() === 'g';
    if (esAtajo) trigger();
  });
};
