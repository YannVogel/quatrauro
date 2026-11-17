// Réglages de l'app. Les paramètres du mélange, eux, sont dans `shared/blendConfig.ts`.

/**
 * Au-delà de cet âge, une prévision est signalée comme ancienne. Le pipeline passe toutes les
 * six heures (ADR 0004) : douze heures, c'est deux passages manqués.
 */
export const STALE_FORECAST_AFTER_HOURS = 12;

/** Nombre de vignettes de la rangée « prochaines heures » de l'accueil. */
export const UPCOMING_HOURS_COUNT = 5;
