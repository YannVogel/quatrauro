// Heure de Paris, calculée sans base de fuseaux horaires : la règle européenne de changement
// d'heure suffit, et elle se comporte de la même façon dans Node (pipeline) et dans Hermes
// (app), où `Intl` ne sait pas donner le décalage d'un fuseau sans polyfill. Voir l'ADR 0005.

const WINTER_OFFSET_MINUTES = 60;
const SUMMER_OFFSET_MINUTES = 120;
const MARCH = 2;
const OCTOBER = 9;
/** L'heure change à 01 h 00 UTC, le dernier dimanche de mars et d'octobre. */
const SWITCH_HOUR_UTC = 1;

function lastSundayAtSwitchHour(year: number, month: number): number {
  const lastDay = new Date(Date.UTC(year, month + 1, 0));
  return Date.UTC(year, month, lastDay.getUTCDate() - lastDay.getUTCDay(), SWITCH_HOUR_UTC);
}

/** Décalage de l'heure de Paris sur UTC à cet instant, en minutes : 60 en hiver, 120 en été. */
export function parisOffsetMinutes(instant: Date): number {
  const time = instant.getTime();
  const year = instant.getUTCFullYear();
  const isSummerTime =
    time >= lastSundayAtSwitchHour(year, MARCH) && time < lastSundayAtSwitchHour(year, OCTOBER);
  return isSummerTime ? SUMMER_OFFSET_MINUTES : WINTER_OFFSET_MINUTES;
}

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DATE_KEY_FORMAT = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Instant dont les champs UTC donnent l'heure qu'il est à Paris. */
function parisWallClock(instant: Date): Date {
  return new Date(instant.getTime() + parisOffsetMinutes(instant) * MINUTE_MS);
}

/** Jour civil de Paris d'un instant, au format `AAAA-MM-JJ`. */
export function parisDateKey(instant: Date): string {
  return parisWallClock(instant).toISOString().slice(0, 10);
}

/** Instant où commence (00 h 00 à Paris) un jour civil donné au format `AAAA-MM-JJ`. */
export function startOfParisDay(dateKey: string): Date {
  const match = DATE_KEY_FORMAT.exec(dateKey);
  if (match === null) throw new Error(`Jour invalide : ${dateKey}`);
  const midnightUtc = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (new Date(midnightUtc).toISOString().slice(0, 10) !== dateKey) {
    throw new Error(`Jour invalide : ${dateKey}`);
  }
  // Minuit à Paris n'est jamais dans l'heure qui change : un seul des deux décalages convient.
  const inSummerTime = new Date(midnightUtc - SUMMER_OFFSET_MINUTES * MINUTE_MS);
  return parisOffsetMinutes(inSummerTime) === SUMMER_OFFSET_MINUTES
    ? inSummerTime
    : new Date(midnightUtc - WINTER_OFFSET_MINUTES * MINUTE_MS);
}

/** Nombre d'heures d'un jour civil de Paris : 24, ou 23 et 25 les jours de changement d'heure. */
export function parisDayLengthHours(dateKey: string): number {
  const start = startOfParisDay(dateKey);
  // Midi plus 24 h tombe toujours dans le jour civil suivant, quelle que soit sa longueur.
  const nextDay = parisDateKey(new Date(start.getTime() + 36 * HOUR_MS));
  return (startOfParisDay(nextDay).getTime() - start.getTime()) / HOUR_MS;
}
