// Correction de biais d'un modèle (ADR 0003, étape 1) : on suit l'écart moyen entre sa
// prévision et l'observation, et on le retranche de ses prévisions suivantes. Le biais est
// suivi séparément pour chaque ville, variable, modèle, tranche d'échéance et heure de la
// journée : c'est l'appelant qui tient un état par case.

import { readDecayedMean, updateDecayedMean } from './decayedMean.ts';
import type { DecayedMean } from './decayedMean.ts';

/** Intègre une paire prévision / observation au biais suivi. Une paire incomplète est ignorée. */
export function updateBias(
  state: DecayedMean,
  forecast: number | null,
  observation: number | null,
  hour: number,
  halfLifeDays: number,
): DecayedMean {
  if (forecast === null || observation === null) return state;
  if (!Number.isFinite(forecast) || !Number.isFinite(observation)) return state;
  return updateDecayedMean(state, forecast - observation, hour, halfLifeDays);
}

/**
 * Biais courant du modèle (prévision − observation), ou `null` tant que l'historique compte
 * moins de `minSamples` paires.
 */
export function readBias(state: DecayedMean, minSamples: number): number | null {
  return readDecayedMean(state, minSamples);
}

/** Prévision corrigée. Un modèle sans historique suffisant n'est pas corrigé. */
export function correctForecast(forecast: number, state: DecayedMean, minSamples: number): number {
  const bias = readBias(state, minSamples);
  return bias === null ? forecast : forecast - bias;
}
