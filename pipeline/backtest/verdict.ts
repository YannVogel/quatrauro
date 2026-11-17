// Critère du feu vert (issue M0-03), écrit avant de regarder les résultats :
// « le mélange réduit l'erreur absolue moyenne de température d'au moins 5 % face au meilleur
// modèle seul "sur la fenêtre précédente", sur la majorité des tranches d'échéance, sans
// dégrader la pluie ».

import type { LeadEvaluation } from './evaluate.ts';

export const TEMPERATURE_MIN_GAIN = 0.05;

/**
 * « Sans dégrader la pluie » : sur les jours de pluie annoncés (toutes échéances confondues),
 * le mélange ne perd pas plus que ces marges face au meilleur modèle seul. Les marges couvrent
 * le bruit d'échantillonnage d'une année (quelques dizaines de jours de pluie par ville).
 */
export const RAIN_MAX_ACCURACY_LOSS = 0.01;
export const RAIN_MAX_CSI_LOSS = 0.02;

/** Gain relatif du mélange sur le meilleur modèle désigné à l'émission (positif = le mélange fait mieux). */
export function gainOverBestPrevious(evaluation: LeadEvaluation): number {
  return 1 - evaluation.blend.mae / evaluation.bestPrevious.mae;
}

export type TemperatureVerdict = {
  readonly leadsWithGain: readonly number[];
  readonly leadsEvaluated: readonly number[];
  readonly passed: boolean;
};

/** Le critère de température est rempli si une majorité stricte des échéances atteint le gain demandé. */
export function judgeTemperature(evaluations: readonly LeadEvaluation[]): TemperatureVerdict {
  const leadsEvaluated = evaluations.map((evaluation) => evaluation.lead);
  const leadsWithGain = evaluations
    .filter((evaluation) => gainOverBestPrevious(evaluation) >= TEMPERATURE_MIN_GAIN)
    .map((evaluation) => evaluation.lead);
  return {
    leadsWithGain,
    leadsEvaluated,
    passed: leadsWithGain.length > leadsEvaluated.length / 2,
  };
}

export type RainScores = { readonly accuracy: number; readonly csi: number };

export function isRainDegraded(blend: RainScores, bestPrevious: RainScores): boolean {
  return (
    blend.accuracy < bestPrevious.accuracy - RAIN_MAX_ACCURACY_LOSS ||
    blend.csi < bestPrevious.csi - RAIN_MAX_CSI_LOSS
  );
}
