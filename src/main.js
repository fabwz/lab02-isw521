import { isAuthenticated } from './state/appState.js';
import { renderLoginScreen } from './ui/loginForm.js';

const app = document.querySelector('#app');

const iniciarApp = () => {
  // TODO: montar navbar + vista Itinerarios (pendiente de implementar).
  app.innerHTML = '<p class="text-center mt-20">Sesión iniciada. Vista principal pendiente.</p>';
};

if (isAuthenticated()) {
  iniciarApp();
} else {
  renderLoginScreen(app, { onSuccess: iniciarApp });
}
