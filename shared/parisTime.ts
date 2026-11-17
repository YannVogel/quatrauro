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
