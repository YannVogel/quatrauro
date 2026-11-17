// Jour ou nuit, par la hauteur du soleil. Formules de faible précision de l'Astronomical
// Almanac (position du soleil au centième de degré près, bien assez pour dire s'il est levé).
// Aucun appel réseau, aucune base de données : le résultat ne dépend que de l'instant et du lieu.

const DEGREE = Math.PI / 180;
const DAY_MS = 86_400_000;
/** Nombre de jours entre le 1er janvier 1970 à 0 h UTC et l'époque J2000 (1er janvier 2000 à 12 h UTC). */
const J2000_IN_UNIX_DAYS = 10_957.5;
/**
 * Hauteur du centre du soleil à son lever et à son coucher, en degrés : la réfraction de
 * l'atmosphère et le rayon du disque le montrent alors qu'il est encore sous l'horizon.
 */
const SUNRISE_ELEVATION = -0.833;

export type Place = { readonly latitude: number; readonly longitude: number };

/** Hauteur du soleil au-dessus de l'horizon, en degrés ; négative quand il est couché. */
export function solarElevation(instant: Date, place: Place): number {
  const days = instant.getTime() / DAY_MS - J2000_IN_UNIX_DAYS;
  const meanLongitude = 280.46 + 0.9856474 * days;
  const meanAnomaly = (357.528 + 0.9856003 * days) * DEGREE;
  const eclipticLongitude =
    (meanLongitude + 1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly)) * DEGREE;
  const obliquity = (23.439 - 0.0000004 * days) * DEGREE;
  const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude));
  const rightAscension = Math.atan2(
    Math.cos(obliquity) * Math.sin(eclipticLongitude),
    Math.cos(eclipticLongitude),
  );
  const siderealTimeHours = 18.697374558 + 24.06570982441908 * days;
  const hourAngle = (siderealTimeHours * 15 + place.longitude) * DEGREE - rightAscension;
  const latitude = place.latitude * DEGREE;
  const sine =
    Math.sin(latitude) * Math.sin(declination) +
    Math.cos(latitude) * Math.cos(declination) * Math.cos(hourAngle);
  return Math.asin(sine) / DEGREE;
}

/** Vrai entre le coucher et le lever du soleil. */
export function isNight(instant: Date, place: Place): boolean {
  return solarElevation(instant, place) < SUNRISE_ELEVATION;
}
