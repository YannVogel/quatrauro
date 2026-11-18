// Réglages de l'app. Les paramètres du mélange, eux, sont dans `shared/blendConfig.ts`.

/**
 * Au-delà de cet âge, une prévision est signalée comme ancienne. Le pipeline passe toutes les
 * six heures (ADR 0004) : douze heures, c'est deux passages manqués.
 */
export const STALE_FORECAST_AFTER_HOURS = 12;

/** Nombre de vignettes de la rangée « prochaines heures » de l'accueil. */
export const UPCOMING_HOURS_COUNT = 5;

/** Pas des colonnes du graphique « heure par heure » du détail d'un jour, en heures. */
export const DAY_CHART_STEP_HOURS = 3;

/**
 * À partir de quand les modèles sont « en désaccord » sur un jour, pour la carte du détail :
 * deux heures d'écart sur le début de la pluie, ou deux degrés sur la température maximale.
 */
export const RAIN_START_DISAGREEMENT_HOURS = 2;
export const MAX_TEMPERATURE_DISAGREEMENT = 2;

/** Heure de Paris à laquelle l'écran « Les modèles » compare les modèles : l'après-midi. */
export const MODELS_REFERENCE_HOUR = 15;

/**
 * En dessous de ce nombre d'heures vérifiées, l'écran « Fiabilité » n'affiche pas de score :
 * une semaine de prévisions, c'est le minimum pour qu'une moyenne veuille dire quelque chose.
 */
export const MIN_VERIFIED_HOURS = 7 * 24;

/** Écart, en °C, à partir duquel un jour « prévu contre observé » est signalé. C'est la tolérance d'une prévision tenue. */
export const LARGE_GAP_DEGREES = 2;
