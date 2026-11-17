// Erreur récente d'un modèle corrigé, qui fixe son poids (ADR 0003, étape 2).
// Rejoint `shared/blend/` avec la pondération des modèles (M1-03).

import { updateDecayedMean } from '../../../shared/blend/decayedMean.ts';
import type { DecayedMean } from '../../../shared/blend/decayedMean.ts';

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
