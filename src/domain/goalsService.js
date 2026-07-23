// Diferencia mínima de goles para considerar un partido "goleada" (RF-RG-03).
const DIFERENCIA_MINIMA_GOLEADA = 3;

// RF-RG-R: `teamsById` puede ser null si /get/teams falló — se usa el id crudo como respaldo temporal.
const resolveTeamName = (teamId, teamsById) => teamsById?.get(teamId)?.name_en ?? teamId;
const resolveTeamFlag = (teamId, teamsById) => teamsById?.get(teamId)?.flag ?? null;

// `teams` puede ser null/undefined (RF-RG-R): la lista se renderiza igual con los ids crudos.
export const buildGoalsList = (games, teams) => {
  const teamsById = teams ? new Map(teams.map((team) => [team.id, team])) : null;

  // finished y los scores llegan como string desde /get/games (RF-RG-01/02).
  const partidosFinalizados = games.filter((juego) => juego.finished === 'TRUE');

  const goleadas = partidosFinalizados
    .map((juego) => ({
      ...juego,
      goalDifference: Math.abs(Number(juego.home_score) - Number(juego.away_score)),
    }))
    .filter((juego) => juego.goalDifference >= DIFERENCIA_MINIMA_GOLEADA)
    .sort((a, b) => b.goalDifference - a.goalDifference);

  const matches = goleadas.map((juego) => ({
    id: juego.id,
    // Se conservan los ids crudos aunque teams haya resuelto (RF-RG-R): permiten
    // recalcular nombre/bandera reales más tarde sin volver a pedir /get/games.
    homeTeamId: juego.home_team_id,
    awayTeamId: juego.away_team_id,
    homeTeamName: resolveTeamName(juego.home_team_id, teamsById),
    homeTeamFlag: resolveTeamFlag(juego.home_team_id, teamsById),
    awayTeamName: resolveTeamName(juego.away_team_id, teamsById),
    awayTeamFlag: resolveTeamFlag(juego.away_team_id, teamsById),
    homeScore: Number(juego.home_score),
    awayScore: Number(juego.away_score),
    goalDifference: juego.goalDifference,
    group: juego.group,
    localDate: juego.local_date,
  }));

  return {
    matches,
    totalCount: matches.length,
  };
};

// RF-RG-R: recalcula nombre/bandera sobre matches ya construidos, sin volver a pedir /get/games.
export const reconcileGoalsListWithTeams = (matches, teams) => {
  const teamsById = new Map(teams.map((team) => [team.id, team]));
  return matches.map((match) => ({
    ...match,
    homeTeamName: resolveTeamName(match.homeTeamId, teamsById),
    homeTeamFlag: resolveTeamFlag(match.homeTeamId, teamsById),
    awayTeamName: resolveTeamName(match.awayTeamId, teamsById),
    awayTeamFlag: resolveTeamFlag(match.awayTeamId, teamsById),
  }));
};
