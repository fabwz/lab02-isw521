const TOP_COUNT = 5;

// local_date llega como "MM/DD/YYYY HH:mm", no ISO.
const parseLocalDate = (localDate) => {
  const [fecha, hora] = localDate.split(' ');
  const [mes, dia, anio] = fecha.split('/').map(Number);
  const [horas, minutos] = (hora ?? '0:0').split(':').map(Number);
  return new Date(anio, mes - 1, dia, horas, minutos);
};

// ga de /get/groups queda congelado en fase de grupos (ver context/api-reference.md); por eso
// la UI lo etiqueta como "GC (fase de grupos)" en wallRanking.js.
const buildGoalsAgainstRanking = (groups) => {
  const registros = groups.flatMap((group) =>
    group.teams.map((team) => ({
      teamId: team.team_id,
      goalsAgainst: Number(team.ga),
    })),
  );

  return registros.sort((a, b) => a.goalsAgainst - b.goalsAgainst);
};

// Bracket sin equipo asignado aún: team_id llega como "0" con un label tipo "Winner Match 101".
// Si el partido referenciado ya finalizó, el equipo real se resuelve a mano (ver api-reference.md).
const MATCH_PLACEHOLDER = /^(Winner|Loser) Match (\d+)$/;

const resolvePlaceholderTeamId = (label, gamesById) => {
  const coincidencia = label?.match(MATCH_PLACEHOLDER);
  if (!coincidencia) return null;

  const [, resultado, matchId] = coincidencia;
  const partidoReferenciado = gamesById.get(matchId);
  if (!partidoReferenciado || partidoReferenciado.finished !== 'TRUE') return null;

  const ganoLocal = Number(partidoReferenciado.home_score) > Number(partidoReferenciado.away_score);
  if (resultado === 'Winner') return ganoLocal ? partidoReferenciado.home_team_id : partidoReferenciado.away_team_id;
  return ganoLocal ? partidoReferenciado.away_team_id : partidoReferenciado.home_team_id;
};

const sideIsTeam = (teamId, sideId, sideLabel, gamesById) =>
  sideId === teamId || (sideId === '0' && resolvePlaceholderTeamId(sideLabel, gamesById) === teamId);

const findNextMatch = (teamId, games, gamesById) => {
  const partidosPendientes = games
    .filter((juego) => juego.finished !== 'TRUE' &&
      (sideIsTeam(teamId, juego.home_team_id, juego.home_team_label, gamesById) ||
        sideIsTeam(teamId, juego.away_team_id, juego.away_team_label, gamesById)))
    .sort((a, b) => parseLocalDate(a.local_date) - parseLocalDate(b.local_date));

  return partidosPendientes[0] ?? null;
};

const translateBracketPlaceholder = (label) => {
  const partidoGanador = label.match(/^Winner Match (\d+)$/);
  if (partidoGanador) return `Pendiente de definir (Ganador Partido ${partidoGanador[1]})`;

  const partidoPerdedor = label.match(/^Loser Match (\d+)$/);
  if (partidoPerdedor) return `Pendiente de definir (Perdedor Partido ${partidoPerdedor[1]})`;

  const ganadorGrupo = label.match(/^Winner Group ([A-L])$/);
  if (ganadorGrupo) return `Pendiente de definir (Ganador Grupo ${ganadorGrupo[1]})`;

  const subcampeonGrupo = label.match(/^Runner-up Group ([A-L])$/);
  if (subcampeonGrupo) return `Pendiente de definir (Subcampeón Grupo ${subcampeonGrupo[1]})`;

  return 'Rival aún sin definir';
};

// RF-EM-R: simulateFailure (solo simulador dev) fuerza el error de esta búsqueda puntual.
const resolveNextOpponent = (teamId, games, teamsById, gamesById, simulateFailure) => {
  if (simulateFailure) {
    throw new Error(`Fallo simulado (dev) en la búsqueda de próximo rival del equipo ${teamId} — RF-EM-R`);
  }

  const proximoPartido = findNextMatch(teamId, games, gamesById);

  if (!proximoPartido) {
    return { matchStatus: 'eliminated', nextOpponentName: null, nextOpponentFlag: null, nextMatchDate: null };
  }

  const esLocal = sideIsTeam(teamId, proximoPartido.home_team_id, proximoPartido.home_team_label, gamesById);
  const nextOpponentIdCrudo = esLocal ? proximoPartido.away_team_id : proximoPartido.home_team_id;
  const nextOpponentLabel = esLocal ? proximoPartido.away_team_label : proximoPartido.home_team_label;
  const nextMatchDate = proximoPartido.local_date;

  const nextOpponentId = nextOpponentIdCrudo !== '0' ? nextOpponentIdCrudo : resolvePlaceholderTeamId(nextOpponentLabel, gamesById);
  const nextOpponent = nextOpponentId ? teamsById.get(nextOpponentId) : null;

  if (nextOpponent) {
    return { matchStatus: 'resolved', nextOpponentName: nextOpponent.name_en, nextOpponentFlag: nextOpponent.flag, nextMatchDate };
  }

  return { matchStatus: 'pending-bracket', nextOpponentName: translateBracketPlaceholder(nextOpponentLabel), nextOpponentFlag: null, nextMatchDate };
};

// matchStatus: 'resolved' | 'eliminated' | 'pending-bracket' | 'failed' (RF-EM-R, ver api-reference.md).
export const buildWallRanking = (groups, teams, games, { forcedFailureIndex = null } = {}) => {
  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const gamesById = new Map(games.map((juego) => [juego.id, juego]));

  const top5 = buildGoalsAgainstRanking(groups).slice(0, TOP_COUNT);

  const ranking = top5.map((registro, indice) => {
    const team = teamsById.get(registro.teamId);

    let opponentInfo;
    try {
      opponentInfo = resolveNextOpponent(registro.teamId, games, teamsById, gamesById, indice === forcedFailureIndex);
    } catch (error) {
      console.error('Fallo aislado en búsqueda de próximo rival (RF-EM-R):', error);
      opponentInfo = { matchStatus: 'failed', nextOpponentName: null, nextOpponentFlag: null, nextMatchDate: null };
    }

    return {
      teamId: registro.teamId,
      teamName: team?.name_en ?? registro.teamId,
      teamFlag: team?.flag ?? null,
      goalsAgainst: registro.goalsAgainst,
      ...opponentInfo,
    };
  });

  return { ranking };
};
