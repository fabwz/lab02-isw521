// sessionExpiredModal: overlay que envuelve el MISMO formulario de login de
// loginForm.js (RF-06/RF-08) en un contenedor distinto (modal vs pantalla
// completa). No duplica lógica de autenticación: solo cambia dónde se monta.
import { renderLoginForm } from './loginForm.js';

let modalActual = null;

// showSessionExpiredModal: se llama en cuanto llega un 401 a mitad de uso.
// onReauthenticated(user) se invoca tras un login exitoso desde el modal, y es
// responsabilidad del llamador cerrar el modal y continuar donde el usuario
// estaba (RF-08) — aquí solo cerramos el overlay antes de reenviar el evento.
export const showSessionExpiredModal = ({ onReauthenticated } = {}) => {
  if (modalActual) return; // evita apilar overlays si ya hay uno abierto

  const overlay = document.createElement('div');
  overlay.className =
    'fixed inset-0 z-50 flex items-center justify-center bg-void/70 backdrop-blur-md px-4 modal-enter';
  overlay.innerHTML = '<div id="session-expired-form-slot" class="w-full flex justify-center"></div>';

  document.body.appendChild(overlay);
  modalActual = overlay;

  const slot = overlay.querySelector('#session-expired-form-slot');
  renderLoginForm(slot, {
    subtitle: 'Vuelve a ingresar tus credenciales para continuar.',
    alertMessage: 'Tu sesión expiró',
    onSuccess: (user) => {
      closeSessionExpiredModal();
      onReauthenticated?.(user);
    },
  });
};

export const closeSessionExpiredModal = () => {
  modalActual?.remove();
  modalActual = null;
};

export const isSessionExpiredModalOpen = () => Boolean(modalActual);
