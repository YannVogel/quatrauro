// Température ressentie, dérivée des champs mélangés. Formule de Steadman utilisée par le
// Bureau of Meteorology australien, sans le terme de rayonnement :
//   ressenti = T + 0,33 × e − 0,70 × v − 4,00
// où e est la pression de vapeur d'eau (hPa) et v le vent à 10 m (m/s). Elle diffère de celle
// d'Open-Meteo, qui ajoute le rayonnement solaire : les deux ne donnent pas le même chiffre.

const KMH_PER_MS = 3.6;

/** Pression de vapeur d'eau, en hPa, à partir de la température (°C) et de l'humidité (%). */
function vapourPressure(temperature: number, humidity: number): number {
  return (humidity / 100) * 6.105 * Math.exp((17.27 * temperature) / (237.7 + temperature));
}

/**
 * Température ressentie en °C. `null` si la température, l'humidité ou le vent manque :
 * un ressenti calculé sur une valeur par défaut serait une valeur inventée.
 */
export function apparentTemperature(
  temperature: number | null,
  humidity: number | null,
  windSpeedKmh: number | null,
): number | null {
  if (temperature === null || humidity === null || windSpeedKmh === null) return null;
  const wind = windSpeedKmh / KMH_PER_MS;
  return temperature + 0.33 * vapourPressure(temperature, humidity) - 0.7 * wind - 4;
}
