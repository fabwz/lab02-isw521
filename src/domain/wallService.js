// Cantidad de equipos que entran en el ranking de mejores defensas (RF-EM-03).
const TOP_COUNT = 5;

// /get/games trae local_date como "MM/DD/YYYY HH:mm" (no ISO) — se parsea a mano
// para poder ordenar próximos partidos cronológicamente (RF-EM-04).
const parseLocalDate = (localDate) => {
  const [fecha, hora] = localDate.split(' ');
  const [mes, dia, anio] = fecha.split('/').map(Number);
  const [horas, minutos] = (hora ?? '0:0').split(':').map(Number);
  return new Date(anio, mes - 1, dia, horas, minutos);
};

// RF-EM-01/02: recorre los 12 grupos, extrae team_id+ga (string → number) de cada uno
// de los 4 equipos, unifica los 48 registros y ordena ascendente por ga (mejor defensa primero).
const buildGoalsAgainstRanking = (groups) => {
  const registros = groups.flatMap((group) =>
    group.teams.map((team) => ({
      teamId: team.team_id,
      goalsAgainst: Number(team.ga),
    })),
  );

  return registros.sort((a, b) => a.goalsAgainst - b.goalsAgainst);
};

// RF-EM-04: próximo partido pendiente (finished !== "TRUE") de un equipo, ordenado por
// local_date ascendente — el primero de esa lista es el más próximo.
const findNextMatch = (teamId, games) => {
  const partidosPendientes = games
    .filter((juego) => juego.finished !== 'TRUE' && (juego.home_team_id === teamId || juego.away_team_id === teamId))
    .sort((a, b) => parseLocalDate(a.local_date) - parseLocalDate(b.local_date));

  return partidosPendientes[0] ?? null;
};

// Verificado con datos reales: en fase avanzada del torneo, un partido pendiente puede no
// tener equipo real asignado todavía (home/away_team_id === "0"), solo un label placeholder
// en inglés tipo "Winner Match 102" o "Runner-up Group A". Se traduce a un texto corto en
// español, conservando la referencia (número de partido o letra de grupo) para que siga
// siendo información útil, no un texto genérico vacío.
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

// RF-EM-01 a 04: ranking de las 5 mejores defensas (menos goles en contra) con datos de
// equipo (nombre/bandera, cruzados contra /get/teams, no contra el array anidado de
// /get/groups) y próximo rival (cruzado contra /get/games).
//
// Verificado con datos reales (worldcup26.ir): el próximo rival de un equipo del ranking
// no siempre es un caso simple de "encontrado" — hay 3 estados posibles, distintos entre
// sí y de un futuro fallo de red (RF-EM-R, todavía no implementado):
//   - 'resolved': hay un próximo partido con rival real ya asignado.
//   - 'eliminated': el equipo no tiene ningún partido pendiente (quedó fuera del torneo).
//   - 'pending-bracket': hay un próximo partido (ej. Final, 3er puesto) pero el rival
//     todavía no tiene equipo asignado, solo un placeholder tipo "Winner Match 102".
// "Próximo rival no disponible" (mensaje de fallo técnico) se reserva exclusivamente para
// RF-EM-R y no se usa para ninguno de estos 3 estados, que son normales del torneo.
export const buildWallRanking = (groups, teams, games) => {
  const teamsById = new Map(teams.map((team) => [team.id, team]));

  const top5 = buildGoalsAgainstRanking(groups).slice(0, TOP_COUNT);

  const ranking = top5.map((registro) => {
    const team = teamsById.get(registro.teamId);
    const proximoPartido = findNextMatch(registro.teamId, games);

    let matchStatus = 'eliminated';
    let nextOpponentName = null;
    let nextOpponentFlag = null;
    let nextMatchDate = null;

    if (proximoPartido) {
      const esLocal = proximoPartido.home_team_id === registro.teamId;
      const nextOpponentId = esLocal ? proximoPartido.away_team_id : proximoPartido.home_team_id;
      const nextOpponentLabel = esLocal ? proximoPartido.away_team_label : proximoPartido.home_team_label;
      const nextOpponent = teamsById.get(nextOpponentId);
      nextMatchDate = proximoPartido.local_date;

      if (nextOpponent) {
        matchStatus = 'resolved';
        nextOpponentName = nextOpponent.name_en;
        nextOpponentFlag = nextOpponent.flag;
      } else {
        matchStatus = 'pending-bracket';
        nextOpponentName = translateBracketPlaceholder(nextOpponentLabel);
      }
    }

    return {
      teamId: registro.teamId,
      teamName: team?.name_en ?? registro.teamId,
      teamFlag: team?.flag ?? null,
      goalsAgainst: registro.goalsAgainst,
      matchStatus,
      nextOpponentName,
      nextOpponentFlag,
      nextMatchDate,
    };
  });

  return { ranking };
};
