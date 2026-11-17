// Instants et heures rondes en UTC, tels que les manipulent l'archive et la vérification.

export const HOUR_MS = 3_600_000;
export const DAY_MS = 24 * HOUR_MS;

/** Instant UTC à la seconde, tel que l'écrivent les séries et les fichiers publiés : `2026-11-17T15:00:00Z`. */
export function toInstant(date: Date | number): string {
  return new Date(date).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/** Début de l'heure qui contient cet instant, en millisecondes. */
export const floorToHour = (time: number): number => Math.floor(time / HOUR_MS) * HOUR_MS;

/** Nombre d'heures depuis l'époque Unix : l'horloge des moyennes qui oublient. */
export const hourNumberOf = (time: number): number => Math.round(time / HOUR_MS);

/** Jour UTC d'un instant : `2026-11-17`. */
export const utcDateOf = (time: number): string => new Date(time).toISOString().slice(0, 10);
