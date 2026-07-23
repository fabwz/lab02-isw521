export const buildStadiumsAnalytics = (stadiums, games) => {
  const gameCountByStadiumId = new Map();
  games.forEach((juego) => {
    const cantidadActual = gameCountByStadiumId.get(juego.stadium_id) ?? 0;
    gameCountByStadiumId.set(juego.stadium_id, cantidadActual + 1);
  });

  const stadiumsWithAnalytics = stadiums.map((estadio) => {
    const gameCount = gameCountByStadiumId.get(estadio.id) ?? 0;
    return {
      id: estadio.id,
      name: estadio.name_en,
      cityCountry: `${estadio.city_en}, ${estadio.country_en}`,
      capacity: estadio.capacity,
      gameCount,
      potentialAttendance: estadio.capacity * gameCount,
    };
  });

  const sortedStadiums = [...stadiumsWithAnalytics].sort(
    (a, b) => b.potentialAttendance - a.potentialAttendance
  );

  return { stadiums: sortedStadiums };
};

// gameCount/potentialAttendance en null: señal para stadiumsChart.js de "esperando partidos".
export const buildStadiumsBaseline = (stadiums) => {
  const stadiumsWithoutGames = stadiums.map((estadio) => ({
    id: estadio.id,
    name: estadio.name_en,
    cityCountry: `${estadio.city_en}, ${estadio.country_en}`,
    capacity: estadio.capacity,
    gameCount: null,
    potentialAttendance: null,
  }));

  const sortedStadiums = [...stadiumsWithoutGames].sort((a, b) => b.capacity - a.capacity);

  return { stadiums: sortedStadiums };
};
