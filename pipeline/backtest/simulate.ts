// Rejoue le mélange d'une variable continue sur l'historique. L'ordre des apprentissages et
// des prévisions, qui garantit l'absence de fuite d'information, est celui de `replay`.

import { HOURS_PER_DAY, emptySeries, utcHourAt } from './data/hours.ts';
import type { HourAxis } from './data/hours.ts';
import { correctForecast, updateBias } from '../../shared/blend/bias.ts';
import { blendValues } from './logic/blend.ts';
import { EMPTY_DECAYED_MEAN } from '../../shared/blend/decayedMean.ts';
import type { DecayedMean } from '../../shared/blend/decayedMean.ts';
import { hourBlockOf } from '../../shared/blend/grouping.ts';
import type { BlendParams } from './logic/params.ts';
import { computeWeights, readError, updateError } from '../../shared/blend/weights.ts';
import { replay } from './replay.ts';

export type SimulationInput = {
  readonly axis: HourAxis;
  readonly observation: Float64Array;
  /** `forecasts[modèle][échéance − 1]` ; la série manque au-delà de la portée du modèle. */
  readonly forecasts: readonly (readonly Float64Array[])[];
  readonly observationDelayHours: number;
};

export type LeadSimulation = {
  readonly blend: Float64Array;
  /** Écart-type entre les modèles corrigés. */
  readonly spread: Float64Array;
  /** Prévision corrigée de chaque modèle. */
  readonly corrected: readonly Float64Array[];
};

type ModelState = { bias: DecayedMean; error: DecayedMean };

/** Résultat par échéance : l'indice 0 est J+1. Une échéance hors du découpage n'est pas simulée. */
export function simulateBlend(
  input: SimulationInput,
  params: BlendParams,
): Map<number, LeadSimulation> {
  const { axis, observation, forecasts, observationDelayHours } = input;
  const results = new Map<number, LeadSimulation>();

  for (const leads of params.leadGrouping) {
    for (const lead of leads) {
      results.set(lead, {
        blend: emptySeries(axis),
        spread: emptySeries(axis),
        corrected: forecasts.map(() => emptySeries(axis)),
      });
    }
    // Les modèles d'une tranche partagent leur état entre ses échéances, par bloc horaire.
    const states: ModelState[][] = forecasts.map(() =>
      Array.from({ length: params.hourBlocksPerDay }, () => ({
        bias: EMPTY_DECAYED_MEAN,
        error: EMPTY_DECAYED_MEAN,
      })),
    );
    const blockAt = (position: number): number =>
      hourBlockOf(utcHourAt(axis, position), params.hourBlocksPerDay);

    const learn = (position: number): void => {
      const observed = observation[position] ?? Number.NaN;
      if (!Number.isFinite(observed)) return;
      const block = blockAt(position);
      const hour = axis.startHour + position;
      for (const lead of leads) {
        forecasts.forEach((byLead, model) => {
          const forecast = byLead[lead - 1]?.[position] ?? Number.NaN;
          const state = states[model]?.[block];
          const corrected = results.get(lead)?.corrected[model]?.[position] ?? Number.NaN;
          if (state === undefined || !Number.isFinite(forecast)) return;
          state.bias = updateBias(state.bias, forecast, observed, hour, params.biasHalfLifeDays);
          state.error = updateError(
            state.error,
            corrected,
            observed,
            hour,
            params.errorHalfLifeDays,
          );
        });
      }
    };

    const predict = (lead: number, position: number): void => {
      const result = results.get(lead);
      if (result === undefined) return;
      const block = blockAt(position);
      const values: number[] = [];
      const errors: (number | null)[] = [];
      forecasts.forEach((byLead, model) => {
        const forecast = byLead[lead - 1]?.[position] ?? Number.NaN;
        const state = states[model]?.[block];
        const series = result.corrected[model];
        if (state === undefined || series === undefined || !Number.isFinite(forecast)) return;
        const corrected = correctForecast(forecast, state.bias, params.minSamples);
        series[position] = corrected;
        values.push(corrected);
        errors.push(readError(state.error, params.minSamples));
      });
      const weights = computeWeights(errors, {
        exponent: params.weightExponent,
        errorFloor: params.errorFloor,
        minWeight: params.minWeight,
        maxWeight: params.maxWeight,
      });
      const blend = blendValues(values, weights);
      if (blend === null) return;
      result.blend[position] = blend.value;
      result.spread[position] = blend.spread;
    };

    replay({
      length: axis.length,
      leads,
      stepsPerLeadDay: HOURS_PER_DAY,
      availabilityDelay: observationDelayHours,
      learn,
      predict,
    });
  }
  return results;
}
