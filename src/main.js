import { initFontScale } from './utils/fontScale.js';
import { initI18n, onLanguageChange, t } from './utils/i18n.js';
import { isAuthenticated, clearAuth, getUser } from './state/appState.js';
import { ApiError } from './api/httpClient.js';
import { renderLoginScreen } from './ui/loginForm.js';
import { renderNavbar } from './ui/navbar.js';
import { renderTeamSelector } from './ui/teamSelector.js';
import { renderItineraryCards, markStadiumsUnavailableForCards, markStadiumsResolvedForCards } from './ui/itineraryCards.js';
import { renderGoalsList, patchTeamNamesForCards } from './ui/goalsList.js';
import { renderWallRanking } from './ui/wallRanking.js';
import { renderStadiumsChart, markGamesUnavailableForStadiumsChart } from './ui/stadiumsChart.js';
import { renderDrawsMatrixShell, appendDrawsGroupSection } from './ui/drawsMatrix.js';
import { showSessionExpiredModal } from './ui/sessionExpiredModal.js';
import { mountDevToolsPanel } from './ui/devToolsPanel.js';
import {
  showRateLimitBanner,
  hideRateLimitBanner,
  showServerErrorBanner,
  hideServerErrorBanner,
  showCacheBanner,
  hideCacheBanner,
} from './ui/resilienceBanners.js';
import {
  getTeams,
  getGames,
  getStadiums,
  simulateServerError,
  simulateDrawsGroupRateLimit,
  simulateSessionExpired,
} from './api/worldCupApi.js';
import { getGroups } from './api/groupsApi.js';
import { buildItineraryMatches, crossStadiumsIntoMatches } from './domain/itineraryService.js';
import { buildGoalsList, reconcileGoalsListWithTeams } from './domain/goalsService.js';
import { buildWallRanking } from './domain/wallService.js';
import { buildStadiumsAnalytics, buildStadiumsBaseline } from './domain/stadiumsAnalyticsService.js';
import { buildDrawsRadar } from './domain/drawsService.js';
import { getProjectName } from './ui/projectMenu.js';

const banners = {
  showRateLimitBanner,
  hideRateLimitBanner,
  showServerErrorBanner,
  hideServerErrorBanner,
  showCacheBanner,
  hideCacheBanner,
};

const app = document.querySelector('#app');

const cerrarSesion = () => {
  clearAuth();
  renderLoginScreen(app, { onSuccess: iniciarApp });
};

const manejarSesionExpirada = () => {
  clearAuth();
  showSessionExpiredModal({ onReauthenticated: iniciarApp });
};

// RF-RE-R: se consume una sola vez; ver renderRadarDeEmpates.
let forzar429DespuesDeGrupo = null;

// RF-EM-R: se consume una sola vez; ver renderElMuro y buildWallRanking.
let forzarFalloRivalIndice = null;

mountDevToolsPanel({
  trigger401: async () => {
    await simulateSessionExpired();
    manejarSesionExpirada();
  },
  trigger500: () => simulateServerError('teams', banners),
  triggerFallo429Matriz: () => {
    forzar429DespuesDeGrupo = 'F';
    if (vistaActiva === 'radar-de-empates') {
      renderRadarDeEmpates(app.querySelector('#view-slot'));
    }
  },
  triggerFalloRivalMuro: () => {
    forzarFalloRivalIndice = 2;
    if (vistaActiva === 'el-muro') {
      renderElMuro(app.querySelector('#view-slot'));
    }
  },
});

let vistaActiva = 'ruta-del-campeon';

let seleccionarProyectoActual = null;

const renderDataLoadErrorState = (container, { onRetry }) => {
  container.innerHTML = `
    <div class="glass rounded-[20px] p-8 flex flex-col items-center gap-4 text-center max-w-md mx-auto">
      <p class="body-md text-text-secondary">${t('view.loadError')}</p>
      <button
        type="button"
        class="bg-gradient-accent rounded-full px-6 py-2.5 font-body font-semibold text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-magenta focus-visible:outline-offset-2"
      >
        ${t('view.retry')}
      </button>
    </div>
  `;
  container.querySelector('button').addEventListener('click', onRetry, { once: true });
};

const renderVistaEnConstruccion = (container, proyectoId) => {
  const nombreProyecto = getProjectName(proyectoId) || t('view.genericProject');
  container.innerHTML = `
    <div class="glass rounded-[20px] p-8 flex flex-col items-center gap-2 text-center max-w-md mx-auto">
      <p class="display-md text-white">${nombreProyecto}</p>
      <p class="body-md text-text-secondary">${t('view.underConstruction')}</p>
    </div>
  `;
};

let teamsYGamesEnMemoria = null;

const obtenerTeamsYGames = async () => {
  if (teamsYGamesEnMemoria) return teamsYGamesEnMemoria;

  const [teamsResultado, gamesResultado] = await Promise.allSettled([getTeams(banners), getGames(banners)]);

  if (teamsResultado.status === 'rejected' || gamesResultado.status === 'rejected') {
    const fallos = [teamsResultado, gamesResultado].filter((resultado) => resultado.status === 'rejected');
    const fallo401 = fallos.find((resultado) => resultado.reason instanceof ApiError && resultado.reason.status === 401);
    if (fallo401) throw fallo401.reason;

    const datasetFallido = teamsResultado.status === 'rejected' ? 'teams' : 'games';
    console.error(`Fallo al cargar ${datasetFallido} (sin caché disponible):`, fallos.map((resultado) => resultado.reason));
    throw new Error(`No se pudo cargar ${datasetFallido}`);
  }

  const teams = teamsResultado.value;
  const games = gamesResultado.value;

  if (!Array.isArray(teams) || !Array.isArray(games)) {
    console.error('Respuesta inesperada de la API (se esperaba un array):', { teams, games });
    throw new Error('Respuesta inesperada de teams/games');
  }

  teamsYGamesEnMemoria = { teams, games };
  return teamsYGamesEnMemoria;
};

let stadiumsEnMemoria = null;
let gamesParaAnaliticaEnMemoria = null;

// RF-AE-R: stadiums se pide y renderiza primero para que un fallo posterior de games
// nunca destruya las barras ya dibujadas (solo actualiza vía markGamesUnavailableForStadiumsChart).
const renderAnaliticaDeEstadios = async (container) => {
  container.innerHTML = '<div id="stadiums-chart-slot"></div>';
  const chartSlot = container.querySelector('#stadiums-chart-slot');

  let stadiums;
  try {
    stadiums = stadiumsEnMemoria ?? (await getStadiums(banners));
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      manejarSesionExpirada();
      return;
    }
    console.error('Fallo al cargar stadiums (sin caché disponible):', error);
    renderDataLoadErrorState(container, { onRetry: () => renderAnaliticaDeEstadios(container) });
    return;
  }
  if (!Array.isArray(stadiums)) {
    console.error('Respuesta inesperada de la API (se esperaba un array):', { stadiums });
    renderDataLoadErrorState(container, { onRetry: () => renderAnaliticaDeEstadios(container) });
    return;
  }
  stadiumsEnMemoria = stadiums;

  renderStadiumsChart(chartSlot, buildStadiumsBaseline(stadiums));

  let games;
  try {
    games = gamesParaAnaliticaEnMemoria ?? teamsYGamesEnMemoria?.games ?? (await getGames(banners));
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      manejarSesionExpirada();
      return;
    }
    console.error('Fallo al cargar games (barras de estadios ya renderizadas, se conservan):', error);
    markGamesUnavailableForStadiumsChart(chartSlot);
    return;
  }
  if (!Array.isArray(games)) {
    console.error('Respuesta inesperada de la API (se esperaba un array):', { games });
    markGamesUnavailableForStadiumsChart(chartSlot);
    return;
  }
  gamesParaAnaliticaEnMemoria = games;

  renderStadiumsChart(chartSlot, buildStadiumsAnalytics(stadiums, games));
};

const renderRutaDelCampeon = async (container) => {
  container.innerHTML = `
    <div class="mt-6 mb-6">
      <h2 class="header-enter font-display text-[1.625rem] leading-[1.875rem] font-bold text-white">${t('itinerary.title')}</h2>
      <p class="header-enter body-sm text-text-secondary mt-2" style="animation-delay: 60ms">${t('itinerary.description')}</p>
    </div>
    <div id="team-selector-slot" class="max-w-xs"></div>
    <div id="itinerary-slot"></div>
  `;

  const selectorSlot = container.querySelector('#team-selector-slot');
  const itinerarySlot = container.querySelector('#itinerary-slot');

  let teams;
  let games;

  try {
    ({ teams, games } = await obtenerTeamsYGames());
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      manejarSesionExpirada();
      return;
    }
    console.error('Fallo al cargar teams/games (sin caché disponible):', error);
    renderDataLoadErrorState(container, { onRetry: () => renderRutaDelCampeon(container) });
    return;
  }

  // RF-11: se pide una sola vez por carga de vista; las tarjetas se parchan al resolver, sin re-renderizar la lista completa.
  const stadiumsPromise = stadiumsEnMemoria ? Promise.resolve(stadiumsEnMemoria) : getStadiums(banners);

  // Descarta el parche si el usuario ya cambió de equipo antes de que stadiumsPromise resuelva.
  let seleccionActual = 0;

  renderTeamSelector(selectorSlot, teams, {
    onTeamSelected: async (selectedTeamId) => {
      const miSeleccion = ++seleccionActual;
      const equipoSeleccionado = teams.find((team) => team.id === selectedTeamId);
      const matches = buildItineraryMatches(selectedTeamId, teams, games);
      renderItineraryCards(itinerarySlot, equipoSeleccionado.name_en, equipoSeleccionado.flag, {
        matches,
        citiesVisitedCount: null,
      });

      let stadiums;
      try {
        stadiums = await stadiumsPromise;
      } catch (error) {
        if (miSeleccion !== seleccionActual) return;
        if (error instanceof ApiError && error.status === 401) {
          manejarSesionExpirada();
          return;
        }
        console.error('Fallo al cargar stadiums (sin caché disponible):', error);
        markStadiumsUnavailableForCards(itinerarySlot, matches.map((match) => match.id));
        return;
      }
      if (miSeleccion !== seleccionActual) return;
      if (!Array.isArray(stadiums)) stadiums = [];
      stadiumsEnMemoria = stadiums;

      const itinerarioConEstadios = crossStadiumsIntoMatches(matches, stadiums);
      markStadiumsResolvedForCards(itinerarySlot, itinerarioConEstadios.matches, itinerarioConEstadios.citiesVisitedCount);
    },
  });
};

let currentGoleadasMatches = [];

const renderRastreadorDeGoleadas = async (container) => {
  container.innerHTML = '<div id="goals-slot"></div>';
  const goalsSlot = container.querySelector('#goals-slot');

  if (teamsYGamesEnMemoria) {
    const goleadas = buildGoalsList(teamsYGamesEnMemoria.games, teamsYGamesEnMemoria.teams);
    currentGoleadasMatches = goleadas.matches;
    renderGoalsList(goalsSlot, goleadas);
    return;
  }

  // RF-RG-R: games y teams se piden por separado para que un fallo de teams no bloquee la vista.
  let games;
  try {
    games = await getGames(banners);
    if (!Array.isArray(games)) throw new Error('Respuesta inesperada de /get/games');
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      manejarSesionExpirada();
      return;
    }
    console.error('Fallo al cargar games (sin caché disponible):', error);
    renderDataLoadErrorState(container, { onRetry: () => renderRastreadorDeGoleadas(container) });
    return;
  }

  let teams = null;
  try {
    teams = await getTeams(banners);
    if (!Array.isArray(teams)) throw new Error('Respuesta inesperada de /get/teams');
    teamsYGamesEnMemoria = { teams, games };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      manejarSesionExpirada();
      return;
    }
    console.error('Fallo al cargar teams (RF-RG-R: se muestran ids crudos y se reintenta en segundo plano):', error);
    teams = null;
  }

  const goleadas = buildGoalsList(games, teams);
  currentGoleadasMatches = goleadas.matches;
  renderGoalsList(goalsSlot, goleadas);

  if (!teams) {
    reintentarTeamsParaGoleadas(goalsSlot, games);
  }
};

// RF-RG-R: reintenta /get/teams en segundo plano y parchea solo nombres/banderas de las tarjetas ya renderizadas.
const reintentarTeamsParaGoleadas = async (goalsSlot, games) => {
  try {
    const teamsRecuperados = await getTeams(banners);
    if (!Array.isArray(teamsRecuperados)) return;

    teamsYGamesEnMemoria = { teams: teamsRecuperados, games };

    if (!goalsSlot.isConnected) return;

    currentGoleadasMatches = reconcileGoalsListWithTeams(currentGoleadasMatches, teamsRecuperados);
    patchTeamNamesForCards(goalsSlot, currentGoleadasMatches);
    console.debug('[resiliencia] RF-RG-R — /get/teams se recuperó, nombres reales aplicados sobre la vista ya renderizada');
  } catch (error) {
    console.error('Fallo al reintentar /get/teams en segundo plano (RF-RG-R):', error);
  }
};

const renderElMuro = async (container) => {
  container.innerHTML = '<div id="wall-slot"></div>';
  const wallSlot = container.querySelector('#wall-slot');

  let teams;
  let games;
  try {
    ({ teams, games } = await obtenerTeamsYGames());
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      manejarSesionExpirada();
      return;
    }
    console.error('Fallo al cargar teams/games (sin caché disponible):', error);
    renderDataLoadErrorState(container, { onRetry: () => renderElMuro(container) });
    return;
  }

  let groups;
  try {
    groups = await getGroups(banners);
    if (!Array.isArray(groups)) throw new Error('Respuesta inesperada de /get/groups');
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      manejarSesionExpirada();
      return;
    }
    console.error('Fallo al cargar groups (sin caché disponible):', error);
    renderDataLoadErrorState(container, { onRetry: () => renderElMuro(container) });
    return;
  }

  const indiceFallo = forzarFalloRivalIndice;
  forzarFalloRivalIndice = null;

  const { ranking } = buildWallRanking(groups, teams, games, { forcedFailureIndex: indiceFallo });
  renderWallRanking(wallSlot, { ranking });
};

// RF-RE-R: la matriz se pinta grupo por grupo, nunca de un solo golpe; un 429 forzado en un
// grupo entra en backoff sin afectar los grupos ya agregados al DOM.
const PAUSA_ENTRE_GRUPOS_MS = 250;
const espera = (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs));

const renderRadarDeEmpates = async (container) => {
  container.innerHTML = '';

  let teams;
  let games;
  try {
    ({ teams, games } = await obtenerTeamsYGames());
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      manejarSesionExpirada();
      return;
    }
    console.error('Fallo al cargar teams/games (sin caché disponible):', error);
    renderDataLoadErrorState(container, { onRetry: () => renderRadarDeEmpates(container) });
    return;
  }

  const { groups, totalCount } = buildDrawsRadar(games, teams);
  renderDrawsMatrixShell(container, totalCount);
  const groupsSlot = container.querySelector('#draws-groups-slot');

  const letraLimiteFallo = forzar429DespuesDeGrupo;
  forzar429DespuesDeGrupo = null;
  let yaSimuloFallo = false;

  for (const group of groups) {
    if (!yaSimuloFallo && letraLimiteFallo && group.group > letraLimiteFallo) {
      yaSimuloFallo = true;
      await simulateDrawsGroupRateLimit(group.group, banners, { failCount: 4 });
      if (!groupsSlot.isConnected) return;
    }

    appendDrawsGroupSection(groupsSlot, group);
    await espera(PAUSA_ENTRE_GRUPOS_MS);
  }
};

const renderVistaActiva = async (viewSlot) => {
  if (vistaActiva === 'ruta-del-campeon') {
    await renderRutaDelCampeon(viewSlot);
  } else if (vistaActiva === 'rastreador-de-goleadas') {
    await renderRastreadorDeGoleadas(viewSlot);
  } else if (vistaActiva === 'el-muro') {
    await renderElMuro(viewSlot);
  } else if (vistaActiva === 'analitica-de-estadios') {
    await renderAnaliticaDeEstadios(viewSlot);
  } else if (vistaActiva === 'radar-de-empates') {
    await renderRadarDeEmpates(viewSlot);
  } else {
    renderVistaEnConstruccion(viewSlot, vistaActiva);
  }
};

const iniciarApp = async () => {
  app.innerHTML = `
    <div id="navbar-slot"></div>
    <main class="min-h-screen px-4 py-24 max-w-5xl mx-auto flex flex-col gap-8">
      <div id="view-slot"></div>
    </main>
  `;

  const viewSlot = app.querySelector('#view-slot');
  const navbarSlot = app.querySelector('#navbar-slot');

  const seleccionarProyecto = async (proyectoId) => {
    if (proyectoId === vistaActiva) return;
    vistaActiva = proyectoId;
    renderNavbar(navbarSlot, getUser(), {
      onLogout: cerrarSesion,
      activeProjectId: vistaActiva,
      onProjectSelected: seleccionarProyecto,
    });

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReducedMotion) {
      viewSlot.classList.add('view-fade-out', 'is-hidden');
      await espera(120);
    }

    await renderVistaActiva(viewSlot);

    if (!prefersReducedMotion) {
      viewSlot.classList.remove('view-fade-out', 'is-hidden');
      viewSlot.classList.add('view-fade-in');
      const quitarClase = () => viewSlot.classList.remove('view-fade-in');
      viewSlot.addEventListener('animationend', quitarClase, { once: true });
      setTimeout(quitarClase, 300);
    }
  };

  seleccionarProyectoActual = seleccionarProyecto;

  renderNavbar(navbarSlot, getUser(), {
    onLogout: cerrarSesion,
    activeProjectId: vistaActiva,
    onProjectSelected: seleccionarProyecto,
  });

  await renderVistaActiva(viewSlot);
};

initI18n();

// RF-A11Y-01: re-renderiza navbar y vista activa al cambiar idioma; solo aplica con sesión iniciada.
onLanguageChange(async () => {
  if (!isAuthenticated()) return;
  const navbarSlot = app.querySelector('#navbar-slot');
  const viewSlot = app.querySelector('#view-slot');
  if (!navbarSlot || !viewSlot) return;
  renderNavbar(navbarSlot, getUser(), {
    onLogout: cerrarSesion,
    activeProjectId: vistaActiva,
    onProjectSelected: seleccionarProyectoActual,
  });
  await renderVistaActiva(viewSlot);
});

initFontScale();

if (isAuthenticated()) {
  iniciarApp();
} else {
  renderLoginScreen(app, { onSuccess: iniciarApp });
}
