/** Instant UTC à la seconde, tel que l'écrivent les séries et les fichiers publiés : `2026-11-17T15:00:00Z`. */
export function toInstant(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}
