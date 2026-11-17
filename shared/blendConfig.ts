// Paramètres du mélange : les seules valeurs en vigueur. Elles ont été fixées par le backtest
// du spike M0-03 et sont justifiées dans l'ADR 0003 (docs/features/backtest.md). Ne pas en
// changer une sans relancer `npm run backtest`.

export const BLEND_CONFIG = {
  /** Tranches d'échéance, en jours, qui partagent leur biais et leur erreur. */
  leadGrouping: [[1], [2], [3], [4, 5], [6, 7]],
  /** Biais et erreur sont suivis séparément pour chaque heure UTC de la journée. */
  hourBlocksPerDay: 24,
  /** Délai, en heures, entre une mesure et sa publication par Météo-France (27 h au plus, mesuré). */
  observationDelayHours: 30,

  /** Variables corrigées de leur biais et pondérées. */
  corrected: {
    /** Vitesse d'oubli du biais : demi-vie du poids d'une erreur passée, en jours. */
    biasHalfLifeDays: 20,
    /** Fenêtre de l'erreur récente qui fixe les poids : demi-vie, en jours. */
    errorHalfLifeDays: 60,
    /** Les poids valent l'inverse de l'erreur, élevé à cet exposant. */
    weightExponent: 4,
    /** En dessous de ce nombre de paires, un modèle n'est ni corrigé ni noté (poids neutre). */
    minSamples: 10,
    /** Erreur plancher, dans l'unité de la variable : un modèle presque parfait n'écrase pas les autres. */
    errorFloor: 0.05,
  },

  rain: {
    /** Il pleut dans l'heure à partir de ce cumul, en mm (la résolution du pluviomètre). */
    hourlyThreshold: 0.2,
    /** C'est un jour de pluie à partir de ce cumul, en mm. */
    dailyThreshold: 1,
    /** Probabilité à partir de laquelle on annonce de la pluie dans l'heure. */
    hourlyAnnouncement: 0.2,
    /** Probabilité à partir de laquelle on annonce un jour de pluie. */
    dailyAnnouncement: 0.3,
    /** Poids de la fréquence d'ensemble face à une classe d'accord peu fournie, en cas fictifs. */
    priorStrength: 5,
    /** En dessous de ce nombre de cas, la probabilité est l'accord brut entre modèles. */
    minSamples: 30,
  },

  reliability: {
    /** Une prévision est tenue si le minimum et le maximum du jour sont à moins de tant de °C. */
    temperatureTolerance: 2,
    /** Seuils de l'écart-type entre modèles (°C) : désaccord faible, moyen, fort. */
    spreadThresholds: [0.6, 0.9],
    /** Entre ces deux probabilités, le signal de pluie est jugé incertain. */
    uncertainRain: { from: 0.2, to: 0.8 },
    /** Poids du taux de la tranche face à une situation peu rencontrée, en jours fictifs. */
    priorStrength: 10,
    /** En dessous de ce nombre de jours vérifiés, l'indice est indisponible. */
    minSamples: 30,
    /** Seuils des libellés : « Sûr » à partir de `sure`, « Probable » à partir de `likely`. */
    labels: { sure: 0.8, likely: 0.6 },
  },
} as const;

/** Plus longue échéance prévue, en jours. */
export const MAX_LEAD_DAYS = 7;
