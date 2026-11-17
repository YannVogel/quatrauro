// Correction de biais d'un modèle (ADR 0003, étape 1) : on suit l'écart moyen entre sa
// prévision et l'observation, et on le retranche de ses prévisions suivantes.

import { readDecayedMean, updateDecayedMean } from '../../../shared/blend/decayedMean.ts';
import type { DecayedMean } from '../../../shared/blend/decayedMean.ts';

/** Intègre une paire prévision / observation au biais suivi. Une paire incomplète est ignorée. */
export function updateBias(
  state: DecayedMean,
  forecast: number,
  observation: number,
  hour: number,
  halfLifeDays: number,
): DecayedMean {
  if (!Number.isFinite(forecast) || !Number.isFinite(observation)) return state;
  return updateDecayedMean(state, forecast - observation, hour, halfLifeDays);
}

/** Prévision corrigée. Un modèle sans historique suffisant n'est pas corrigé. */
export function correctForecast(forecast: number, state: DecayedMean, minSamples: number): number {
  const bias = readDecayedMean(state, minSamples);
  return bias === null ? forecast : forecast - bias;
}

/** Intègre l'erreur absolue d'une prévision corrigée à l'erreur récente du modèle. */
export function updateError(
  state: DecayedMean,
  correctedForecast: number,
  observation: number,
  hour: number,
  halfLifeDays: number,
): DecayedMean {
  if (!Number.isFinite(correctedForecast) || !Number.isFinite(observation)) return state;
  return updateDecayedMean(state, Math.abs(correctedForecast - observation), hour, halfLifeDays);
}
