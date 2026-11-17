// Réglages du pipeline qui ne touchent pas au mélange (ceux-là sont dans shared/blendConfig.ts).

/** Jours d'observations redemandés à chaque passage : de quoi rattraper les mesures en retard. */
export const OBSERVATION_LOOKBACK_DAYS = 10;

/** Période sur laquelle portent les scores publiés, en jours. */
export const VERIFICATION_WINDOW_DAYS = 30;

/** Nombre de jours « prévu contre observé » publiés. */
export const RECENT_DAYS_COUNT = 7;

/** Décimales gardées dans l'archive et dans l'état : bien en deçà de la précision des mesures. */
export const ARCHIVE_DECIMALS = 3;
export const STATE_DECIMALS = 6;

export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
