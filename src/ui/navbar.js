import { renderAccountMenu } from './accountMenu.js';
import { renderProjectMenu } from './projectMenu.js';

export const renderNavbar = (container, user, { onLogout, activeProjectId, onProjectSelected } = {}) => {
  container.innerHTML = `
    <nav class="glass rounded-full px-2 py-2 flex items-center gap-1 fixed top-4 left-1/2 -translate-x-1/2 z-30">
      <div class="h-10 w-32 overflow-hidden relative pl-2 pr-1 [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_82%,transparent)] [-webkit-mask-image:linear-gradient(to_bottom,transparent,black_18%,black_82%,transparent)]">
        <img src="/wc26-analytics-logo.svg" alt="WC26 Analytics" class="h-36 w-auto absolute -top-12 left-2" />
      </div>
      <div id="project-menu-slot"></div>
      <div id="account-menu-slot" class="ml-1"></div>
    </nav>
  `;

  const projectSlot = container.querySelector('#project-menu-slot');
  renderProjectMenu(projectSlot, activeProjectId, { onSelect: onProjectSelected });

  const accountSlot = container.querySelector('#account-menu-slot');
  renderAccountMenu(accountSlot, user, { onLogout });
};
