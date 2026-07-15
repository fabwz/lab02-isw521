// Letras de grupo válidas para fase de grupos (RF-RE-02): el campo `group` de /get/games
// trae código de ronda eliminatoria (R32, QF, ...) para partidos de eliminatorias, que no
// aplican a una matriz agrupada por grupo.
const GROUP_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

const resolveTeamName = (teamId, teamsById) => teamsById.get(teamId)?.name_en ?? teamId;
const resolveTeamFlag = (teamId, teamsById) => teamsById.get(teamId)?.flag ?? null;

// RF-RE-01 a RF-RE-04: filtra empates finalizados de fase de grupos y los agrupa por `group`.
export const buildDrawsRadar = (games, teams) => {
  const teamsById = new Map(teams.map((team) => [team.id, team]));

  // finished/home_score/away_score llegan como string desde /get/games (mismo cuidado que en RF-RG-01/02).
  const empates = games.filter(
    (juego) =>
      juego.finished === 'TRUE' &&
      Number(juego.home_score) === Number(juego.away_score) &&
      GROUP_LETTERS.includes(juego.group)
  );

  const draws = empates.map((juego) => ({
    id: juego.id,
    homeTeamName: resolveTeamName(juego.home_team_id, teamsById),
    homeTeamFlag: resolveTeamFlag(juego.home_team_id, teamsById),
    awayTeamName: resolveTeamName(juego.away_team_id, teamsById),
    awayTeamFlag: resolveTeamFlag(juego.away_team_id, teamsById),
    score: Number(juego.home_score),
    group: juego.group,
    localDate: juego.local_date,
  }));

  const groups = GROUP_LETTERS.map((letra) => ({
    group: letra,
    draws: draws.filter((empate) => empate.group === letra),
  })).filter((grupo) => grupo.draws.length > 0);

  return {
    groups,
    totalCount: draws.length,
  };
};
