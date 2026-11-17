// Les grandeurs météo que Quatrauro prévoit, et la façon dont chacune se mélange (ADR 0003).
// Unités : °C, %, km/h, mm, degrés. Les conversions se font à l'entrée du pipeline.

/** Corrigées de leur biais puis pondérées par l'erreur récente de chaque modèle. */
export const CORRECTED_VARIABLES = ['temperature', 'humidity', 'windSpeed', 'windGusts'] as const;

export type CorrectedVariable = (typeof CORRECTED_VARIABLES)[number];

/**
 * Toutes les grandeurs lues chez chaque modèle. La nébulosité se mélange par moyenne simple,
 * la direction du vent par moyenne vectorielle, la pluie par accord entre modèles.
 */
export const FORECAST_VARIABLES = [
  ...CORRECTED_VARIABLES,
  'windDirection',
  'cloudCover',
  'precipitation',
] as const;

export type ForecastVariable = (typeof FORECAST_VARIABLES)[number];
