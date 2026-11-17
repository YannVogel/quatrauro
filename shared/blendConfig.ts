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
  /** Part des heures d'un jour qu'une variable doit couvrir pour que son agrégat quotidien existe. */
  minDayCoverage: 0.75,

  /** Variables corrigées de leur biais et pondérées. */
  corrected: {
    /** Vitesse d'oubli du biais : demi-vie du poids d'une erreur passée, en jours. */
    biasHalfLifeDays: 20,
    /** Fenêtre de l'erreur récente qui fixe les poids : demi-vie, en jours. */
    errorHalfLifeDays: 60,
    /** En dessous de ce nombre de paires, un modèle n'est ni corrigé ni noté (poids neutre). */
    minSamples: 10,
    weights: {
      /** Les poids valent l'inverse de l'erreur, élevé à cet exposant. */
      exponent: 4,
      /** Erreur plancher, dans l'unité de la variable : un modèle presque parfait n'écrase pas les autres. */
      errorFloor: 0.05,
      /**
       * Garde-fous : aucun modèle ne pèse moins, ni plus, quelle que soit son erreur récente.
       * Mesurés sans effet sur l'erreur du backtest ; des bornes plus serrées la dégradent.
       */
      minWeight: 0.05,
      maxWeight: 0.7,
    },
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
    /** Plafond de l'indice quand un seul modèle couvre le jour : une chance sur deux, « Incertain ». */
    singleModelCap: 0.5,
    /** Un modèle est « d'accord » si sa valeur est à moins de tant de la valeur combinée (°C). */
    agreementTolerance: { temperature: 1 },
    /** Seuils des libellés : « Sûr » à partir de `sure`, « Probable » à partir de `likely`. */
    labels: { sure: 0.8, likely: 0.6 },
  },

  /** Condition météo d'une heure et d'un jour (docs/features/conditions-et-resumes.md). */
  condition: {
    /** Nébulosité, en % : ciel dégagé en dessous de la première, couvert à partir de la seconde. */
    clearBelow: 25,
    cloudyFrom: 75,
    /** Vent fort : vent moyen ou rafales à partir de ces vitesses, en km/h. */
    strongWind: 40,
    strongGusts: 60,
    /** Les précipitations tombent en neige jusqu'à cette température, en °C. */
    snowUpTo: 1,
    /** Un jour de pluie est « Pluie » à partir de tant d'heures de pluie, « Averses » en dessous. */
    lastingRainHours: 6,
    /** Un jour sec est « Vent fort » à partir de tant d'heures de vent fort en journée. */
    windyHours: 3,
  },

  /** Découpage du jour pour les résumés, en heures de Paris. */
  summary: {
    /** La matinée va de la première heure à la seconde, l'après-midi de la seconde à `eveningFrom`. */
    morningFrom: 6,
    afternoonFrom: 12,
    eveningFrom: 18,
    /** La pluie « dure une grande partie de la journée » à partir de tant d'heures. */
    mostOfDayHours: 12,
    /** Une pluie déjà là à cette heure a commencé « dès le début du jour ». */
    earlyUntil: 7,
    /** Une pluie encore là à cette heure dure « jusqu'au soir ». */
    lateFrom: 21,
  },
} as const;

/** Plus longue échéance prévue, en jours. */
export const MAX_LEAD_DAYS = 7;
