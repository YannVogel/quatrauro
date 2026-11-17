// Pluie : une moyenne des cumuls ne dit pas s'il pleuvra. La probabilité vient de l'accord
// entre modèles (quelle part d'entre eux annonce de la pluie), calibrée sur ce qui a été
// observé dans le passé pour le même degré d'accord.

import { EMPTY_FREQUENCY, addOutcome, smoothedRate } from './frequency.ts';
import type { Frequency } from './frequency.ts';
import { isotonic } from './isotonic.ts';

/** Classes d'accord : aucun modèle, une minorité, environ la moitié, une majorité, tous. */
const AGREEMENT_CLASS_BOUNDS = [0, 1 / 3, 2 / 3, 1] as const;
const AGREEMENT_CLASS_COUNT = AGREEMENT_CLASS_BOUNDS.length + 1;

/** Part des modèles disponibles qui annoncent au moins `threshold` mm ; `null` sans modèle. */
export function rainAgreement(amounts: readonly number[], threshold: number): number | null {
  const available = amounts.filter((amount) => Number.isFinite(amount));
  if (available.length === 0) return null;
  return available.filter((amount) => amount >= threshold).length / available.length;
}

export function agreementClassOf(agreement: number): number {
  if (agreement <= 0) return 0;
  if (agreement >= 1) return AGREEMENT_CLASS_COUNT - 1;
  if (agreement < AGREEMENT_CLASS_BOUNDS[1]) return 1;
  return agreement < AGREEMENT_CLASS_BOUNDS[2] ? 2 : 3;
}

export type RainCalibration = {
  readonly overall: Frequency;
  readonly byClass: readonly Frequency[];
};

export const EMPTY_RAIN_CALIBRATION: RainCalibration = {
  overall: EMPTY_FREQUENCY,
  byClass: Array.from({ length: AGREEMENT_CLASS_COUNT }, () => EMPTY_FREQUENCY),
};

export function updateRainCalibration(
  calibration: RainCalibration,
  agreement: number,
  rained: boolean,
): RainCalibration {
  const updated = agreementClassOf(agreement);
  return {
    overall: addOutcome(calibration.overall, rained),
    byClass: calibration.byClass.map((frequency, index) =>
      index === updated ? addOutcome(frequency, rained) : frequency,
    ),
  };
}

export type RainOptions = {
  /** Poids de la fréquence d'ensemble face à celle d'une classe peu fournie, en nombre de cas. */
  readonly priorStrength: number;
  /** En dessous de ce nombre de cas, la probabilité est l'accord brut entre modèles. */
  readonly minSamples: number;
};

/** Probabilité de pluie (0 à 1) pour un degré d'accord donné. Elle ne baisse jamais quand l'accord augmente. */
export function rainProbability(
  calibration: RainCalibration,
  agreement: number,
  options: RainOptions,
): number {
  const { overall, byClass } = calibration;
  if (overall.total < options.minSamples) return agreement;
  const climatology = overall.hits / overall.total;
  const rates = byClass.map((frequency) =>
    smoothedRate(frequency, climatology, options.priorStrength),
  );
  const weights = byClass.map((frequency) => frequency.total + options.priorStrength);
  return isotonic(rates, weights, 'increasing')[agreementClassOf(agreement)] ?? agreement;
}
