// Références auxquelles le mélange est comparé : la moyenne simple des modèles bruts, et le
// « meilleur modèle seul » tel qu'on pouvait le désigner à l'émission de la prévision.

import { HOURS_PER_DAY, emptySeries } from './data/hours.ts';
import type { SimulationInput } from './simulate.ts';

function forecastAt(input: SimulationInput, model: number, lead: number, position: number): number {
  return input.forecasts[model]?.[lead - 1]?.[position] ?? Number.NaN;
}

/** Moyenne simple des modèles bruts disponibles à cette échéance. */
export function simpleMean(input: SimulationInput, lead: number): Float64Array {
  const result = emptySeries(input.axis);
  for (let position = 0; position < input.axis.length; position += 1) {
    let sum = 0;
    let count = 0;
    for (let model = 0; model < input.forecasts.length; model += 1) {
      const value = forecastAt(input, model, lead, position);
      if (!Number.isFinite(value)) continue;
      sum += value;
      count += 1;
    }
    if (count > 0) result[position] = sum / count;
  }
  return result;
}

export type BestModelOptions = {
  readonly windowDays: number;
  /** Nombre minimal de paires dans la fenêtre pour qu'un modèle puisse être désigné. */
  readonly minSamples: number;
};

/**
 * Prévision brute du modèle qui avait la plus petite erreur absolue moyenne sur la fenêtre
 * précédant l'émission, parmi les observations alors publiées. C'est la comparaison honnête :
 * elle n'utilise rien de postérieur à l'émission.
 */
export function bestModelOnPreviousWindow(
  input: SimulationInput,
  lead: number,
  options: BestModelOptions,
): Float64Array {
  const { axis, observation, observationDelayHours } = input;
  const cumulativeError = input.forecasts.map(() => new Float64Array(axis.length + 1));
  const cumulativeCount = input.forecasts.map(() => new Float64Array(axis.length + 1));
  for (let model = 0; model < input.forecasts.length; model += 1) {
    const errors = cumulativeError[model];
    const counts = cumulativeCount[model];
    if (errors === undefined || counts === undefined) continue;
    for (let position = 0; position < axis.length; position += 1) {
      const error = Math.abs(
        forecastAt(input, model, lead, position) - (observation[position] ?? Number.NaN),
      );
      const usable = Number.isFinite(error);
      errors[position + 1] = (errors[position] ?? 0) + (usable ? error : 0);
      counts[position + 1] = (counts[position] ?? 0) + (usable ? 1 : 0);
    }
  }

  const result = emptySeries(axis);
  for (let position = 0; position < axis.length; position += 1) {
    const issued = position - HOURS_PER_DAY * lead;
    // Dernière observation publiée à l'émission, bornes de la fenêtre en positions de l'axe.
    const end = Math.min(Math.max(issued - observationDelayHours + 1, 0), axis.length);
    const start = Math.max(end - options.windowDays * HOURS_PER_DAY, 0);
    let bestError = Number.POSITIVE_INFINITY;
    let bestValue = Number.NaN;
    for (let model = 0; model < input.forecasts.length; model += 1) {
      const value = forecastAt(input, model, lead, position);
      const count = (cumulativeCount[model]?.[end] ?? 0) - (cumulativeCount[model]?.[start] ?? 0);
      if (!Number.isFinite(value) || count < options.minSamples) continue;
      const error =
        ((cumulativeError[model]?.[end] ?? 0) - (cumulativeError[model]?.[start] ?? 0)) / count;
      if (error < bestError) {
        bestError = error;
        bestValue = value;
      }
    }
    result[position] = bestValue;
  }
  return result;
}
