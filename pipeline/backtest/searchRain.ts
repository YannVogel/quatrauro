// Réglage de la pluie sur la période de sélection : force de l'a priori de calibration, puis
// probabilité à partir de laquelle on annonce de la pluie.

import type { Model } from './config.ts';
import type { CityData } from './data/dataset.ts';
import type { DateRange } from './evaluate.ts';
import { evaluateRain } from './evaluateRain.ts';
import type { RainLevel } from './evaluateRain.ts';
import type { LeadGrouping } from './logic/grouping.ts';
import { accuracy, brierScore, criticalSuccessIndex, mergeContingencies } from './rainScores.ts';
import type { RainSettings } from './simulateRain.ts';

export const RAIN_GRID = {
  priorStrength: [5, 20],
  announcementProbability: [0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5],
} as const;

export const RAIN_FIXED = { minSamples: 30 } as const;

/** Écart d'indice de succès critique en dessous duquel deux seuils d'annonce sont équivalents. */
export const CSI_TIE_TOLERANCE = 0.005;

/** Deux scores de Brier issus du même a priori sont égaux aux arrondis près. */
const BRIER_EPSILON = 1e-12;

export type RainCandidateResult = {
  readonly priorStrength: number;
  readonly announcementProbability: number;
  readonly brier: number;
  readonly accuracy: number;
  readonly csi: number;
};

export function buildRainSettings(
  leadGrouping: LeadGrouping,
  threshold: number,
  priorStrength: number,
  announcementProbability: number,
): RainSettings {
  return { leadGrouping, threshold, calibration: { priorStrength, minSamples: RAIN_FIXED.minSamples }, announcementProbability };
}

export function searchRain(
  level: RainLevel,
  cities: readonly CityData[],
  models: readonly Model[],
  leadGrouping: LeadGrouping,
  threshold: number,
  range: DateRange,
): RainCandidateResult[] {
  return RAIN_GRID.priorStrength.flatMap((priorStrength) =>
    RAIN_GRID.announcementProbability.map((announcementProbability) => {
      const settings = buildRainSettings(leadGrouping, threshold, priorStrength, announcementProbability);
      const evaluations = cities.flatMap((data) => evaluateRain(level, data, models, settings, range));
      const table = mergeContingencies(evaluations.map((evaluation) => evaluation.blend));
      return {
        priorStrength,
        announcementProbability,
        brier: brierScore(
          evaluations.flatMap((evaluation) => evaluation.probabilities),
          evaluations.flatMap((evaluation) => evaluation.outcomes),
        ),
        accuracy: accuracy(table),
        csi: criticalSuccessIndex(table),
      };
    }),
  );
}

/**
 * Réglage retenu : l'a priori qui donne la meilleure probabilité (score de Brier), puis le
 * seuil d'annonce qui donne le meilleur indice de succès critique ; entre seuils équivalents,
 * celui qui donne le plus de bonnes annonces.
 */
export function selectRainCandidate(results: readonly RainCandidateResult[]): RainCandidateResult {
  const bestBrier = Math.min(...results.map((result) => result.brier));
  const calibrated = results.filter((result) => result.brier <= bestBrier + BRIER_EPSILON);
  const bestCsi = Math.max(...calibrated.map((result) => result.csi));
  return calibrated
    .filter((result) => result.csi >= bestCsi - CSI_TIE_TOLERANCE)
    .reduce((a, b) => (b.accuracy > a.accuracy ? b : a));
}
