// Pondération des modèles (ADR 0003, étape 2) : chaque modèle pèse en raison inverse de son
// erreur absolue moyenne récente, une fois son biais corrigé. Comme le biais, l'erreur est
// suivie par ville, variable, modèle, tranche d'échéance et heure de la journée.

import { readDecayedMean, updateDecayedMean } from './decayedMean.ts';
import type { DecayedMean } from './decayedMean.ts';

/** Intègre l'erreur absolue d'une prévision corrigée à l'erreur récente du modèle. */
export function updateError(
  state: DecayedMean,
  correctedForecast: number | null,
  observation: number | null,
  hour: number,
  halfLifeDays: number,
): DecayedMean {
  if (correctedForecast === null || observation === null) return state;
  if (!Number.isFinite(correctedForecast) || !Number.isFinite(observation)) return state;
  return updateDecayedMean(state, Math.abs(correctedForecast - observation), hour, halfLifeDays);
}

/** Erreur absolue moyenne récente, ou `null` tant que l'historique compte moins de `minSamples` paires. */
export function readError(state: DecayedMean, minSamples: number): number | null {
  return readDecayedMean(state, minSamples);
}

export type WeightOptions = {
  /** 0 donne des poids égaux ; plus l'exposant est grand, plus le meilleur modèle domine. */
  readonly exponent: number;
  /** Erreur plancher, pour qu'un modèle presque parfait sur une courte période n'écrase pas les autres. */
  readonly errorFloor: number;
  /** Garde-fous : aucun modèle ne pèse moins que `minWeight` ni plus que `maxWeight`. */
  readonly minWeight: number;
  readonly maxWeight: number;
};

const sum = (values: readonly number[]): number =>
  values.reduce((total, value) => total + value, 0);

/**
 * Ramène des poids strictement positifs dans l'intervalle [min, max] avec une somme de 1.
 * Tous sont multipliés par un même facteur, puis bornés : les modèles que les bornes ne
 * touchent pas gardent entre eux leurs proportions.
 *
 * La somme des poids bornés croît avec le facteur, par morceaux linéaires dont les ruptures
 * sont les facteurs où un poids touche une borne. On repère le morceau où la somme passe par
 * 1, et le facteur s'y calcule directement. Il existe dès que n × min ≤ 1 ≤ n × max.
 */
function clampWeights(weights: readonly number[], min: number, max: number): number[] {
  const scaled = (factor: number): number[] =>
    weights.map((weight) => Math.min(Math.max(weight * factor, min), max));

  const breakpoints = weights
    .flatMap((weight) => [min / weight, max / weight])
    .sort((a, b) => a - b);
  let lower = 0;
  let lowerSum = sum(scaled(lower));
  for (const upper of breakpoints) {
    const upperSum = sum(scaled(upper));
    if (upperSum >= 1) {
      const span = upperSum - lowerSum;
      const factor = span === 0 ? upper : lower + ((1 - lowerSum) / span) * (upper - lower);
      return scaled(factor);
    }
    lower = upper;
    lowerSum = upperSum;
  }
  return scaled(lower);
}

/**
 * Poids des modèles disponibles, de somme 1. `errors[i]` est l'erreur récente du modèle `i`,
 * ou `null` s'il n'a pas assez d'historique : il reçoit alors un poids neutre, égal à la
 * moyenne des poids des modèles notés. Un modèle absent du passage n'est simplement pas dans
 * la liste : les autres se partagent alors toute la somme.
 */
export function computeWeights(
  errors: readonly (number | null)[],
  options: WeightOptions,
): number[] {
  if (errors.length === 0) return [];
  const raw = errors.map((error) =>
    error === null ? null : (1 / Math.max(error, options.errorFloor)) ** options.exponent,
  );
  const rated = raw.filter((weight): weight is number => weight !== null);
  const neutral = rated.length === 0 ? 1 : sum(rated) / rated.length;
  const filled = raw.map((weight) => weight ?? neutral);
  const total = sum(filled);
  const normalized = filled.map((weight) => weight / total);

  // Avec peu de modèles, les bornes s'effacent devant le partage égal : un modèle seul pèse 1.
  const equalShare = 1 / errors.length;
  const min = Math.min(options.minWeight, equalShare);
  const max = Math.max(options.maxWeight, equalShare);
  const isWithinBounds = normalized.every((weight) => weight >= min && weight <= max);
  return isWithinBounds ? normalized : clampWeights(normalized, min, max);
}
