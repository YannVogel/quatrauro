// Mélange d'une variable corrigée (température, humidité, vent moyen, rafales) à une échéance
// donnée : correction du biais de chaque modèle, poids selon son erreur récente, moyenne
// pondérée. C'est la fonction que rejouent le backtest et le pipeline.

import { correctForecast } from './bias.ts';
import { blendValues } from './blend.ts';
import type { DecayedMean } from './decayedMean.ts';
import { computeWeights, readError } from './weights.ts';
import type { WeightOptions } from './weights.ts';

export type CorrectedInput = {
  /** Prévision brute du modèle. */
  readonly forecast: number;
  readonly bias: DecayedMean;
  readonly error: DecayedMean;
};

export type CorrectedParams = {
  /** En dessous de ce nombre de paires, un modèle n'est ni corrigé ni noté. */
  readonly minSamples: number;
  readonly weights: WeightOptions;
};

export type CorrectedBlend = {
  readonly value: number;
  /** Écart-type entre les modèles corrigés : leur désaccord. */
  readonly spread: number;
  /** Prévision corrigée et poids de chaque modèle, dans l'ordre des entrées. */
  readonly corrected: readonly number[];
  readonly weights: readonly number[];
};

/** `null` quand aucun modèle n'est disponible : on n'invente pas de valeur. */
export function blendCorrected(
  inputs: readonly CorrectedInput[],
  params: CorrectedParams,
): CorrectedBlend | null {
  const corrected = inputs.map((input) =>
    correctForecast(input.forecast, input.bias, params.minSamples),
  );
  const weights = computeWeights(
    inputs.map((input) => readError(input.error, params.minSamples)),
    params.weights,
  );
  const blend = blendValues(corrected, weights);
  return blend === null ? null : { ...blend, corrected, weights };
}
