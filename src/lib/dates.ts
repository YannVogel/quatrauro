// Affichage des dates et des heures : toujours à l'heure de Paris, toujours en français,
// quel que soit le réglage du téléphone.

import { UTCDate } from '@date-fns/utc';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { parisOffsetMinutes } from '@shared/parisTime';

const MINUTE_MS = 60_000;

/**
 * Met en forme un instant à l'heure de Paris, avec un motif de date-fns (`EEEE d MMMM`, `HH`…).
 * La semaine commence le lundi, comme le veut la locale française.
 */
export function formatInParis(instant: Date, pattern: string): string {
  // date-fns lit les champs UTC d'une `UTCDate` : on lui donne l'heure murale de Paris.
  const wallClock = new UTCDate(instant.getTime() + parisOffsetMinutes(instant) * MINUTE_MS);
  return format(wallClock, pattern, { locale: fr });
}

const NON_BREAKING_SPACE = '\u00a0';

/** Heure et minutes à Paris : « 15 h 02 », avec des espaces insécables. */
export function formatTimeInParis(instant: Date): string {
  return formatInParis(instant, "H 'h' mm").replaceAll(' ', NON_BREAKING_SPACE);
}

/** Jour à Paris : « mardi 17 novembre ». */
export function formatDayInParis(instant: Date): string {
  return formatInParis(instant, 'EEEE d MMMM');
}
