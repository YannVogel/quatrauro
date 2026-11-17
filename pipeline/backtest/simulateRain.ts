// Rejoue la prévision de pluie : probabilité tirée de l'accord entre modèles et calibrée sur
// le passé, à l'heure et à la journée ; cumul par moyenne simple des modèles.

import { HOURS_PER_DAY } from './data/hours.ts';
import { dailyAvailabilityDelay, dailySum } from './daily.ts';
import type { LeadGrouping } from './logic/grouping.ts';
import {
  EMPTY_RAIN_CALIBRATION,
  rainAgreement,
  rainProbability,
  updateRainCalibration,
} from './logic/rain.ts';
import type { RainOptions } from './logic/rain.ts';
import { replay } from './replay.ts';
import type { SimulationInput } from './simulate.ts';

export type RainSettings = {
  readonly leadGrouping: LeadGrouping;
  /** Cumul à partir duquel il « pleut », en mm. */
  readonly threshold: number;
  readonly calibration: RainOptions;
  /** Probabilité à partir de laquelle le mélange annonce de la pluie. */
  readonly announcementProbability: number;
};

export type RainSeries = {
  /** Probabilité de pluie calibrée, de 0 à 1. */
  readonly probability: Float64Array;
  /** Cumul : moyenne simple des modèles disponibles. */
  readonly meanAmount: Float64Array;
};

type Step = {
  readonly observation: Float64Array;
  /** `forecasts[modèle][échéance − 1]`. */
  readonly forecasts: readonly (readonly Float64Array[])[];
  readonly stepsPerLeadDay: number;
  readonly availabilityDelay: number;
};

function simulate(step: Step, settings: RainSettings): Map<number, RainSeries> {
  const length = step.observation.length;
  const results = new Map<number, RainSeries>();
  const agreements = new Map<number, Float64Array>();

  for (const leads of settings.leadGrouping) {
    let calibration = EMPTY_RAIN_CALIBRATION;
    for (const lead of leads) {
      results.set(lead, {
        probability: new Float64Array(length).fill(Number.NaN),
        meanAmount: new Float64Array(length).fill(Number.NaN),
      });
      agreements.set(lead, new Float64Array(length).fill(Number.NaN));
    }

    replay({
      length,
      leads,
      stepsPerLeadDay: step.stepsPerLeadDay,
      availabilityDelay: step.availabilityDelay,
      learn: (position) => {
        const observed = step.observation[position] ?? Number.NaN;
        if (!Number.isFinite(observed)) return;
        for (const lead of leads) {
          const agreement = agreements.get(lead)?.[position] ?? Number.NaN;
          if (!Number.isFinite(agreement)) continue;
          calibration = updateRainCalibration(
            calibration,
            agreement,
            observed >= settings.threshold,
          );
        }
      },
      predict: (lead, position) => {
        const amounts = step.forecasts
          .map((byLead) => byLead[lead - 1]?.[position] ?? Number.NaN)
          .filter((amount) => Number.isFinite(amount));
        const agreement = rainAgreement(amounts, settings.threshold);
        const result = results.get(lead);
        const stored = agreements.get(lead);
        if (agreement === null || result === undefined || stored === undefined) return;
        stored[position] = agreement;
        result.probability[position] = rainProbability(
          calibration,
          agreement,
          settings.calibration,
        );
        result.meanAmount[position] =
          amounts.reduce((total, amount) => total + amount, 0) / amounts.length;
      },
    });
  }
  return results;
}

/** Pluie dans l'heure, par échéance. */
export function simulateHourlyRain(
  input: SimulationInput,
  settings: RainSettings,
): Map<number, RainSeries> {
  return simulate(
    {
      observation: input.observation,
      forecasts: input.forecasts,
      stepsPerLeadDay: HOURS_PER_DAY,
      availabilityDelay: input.observationDelayHours,
    },
    settings,
  );
}

/** Pluie dans la journée (UTC), par échéance. Les séries rendues ont une valeur par jour. */
export function simulateDailyRain(
  input: SimulationInput,
  settings: RainSettings,
): Map<number, RainSeries> {
  return simulate(
    {
      observation: dailySum(input.observation),
      forecasts: input.forecasts.map((byLead) => byLead.map(dailySum)),
      stepsPerLeadDay: 1,
      availabilityDelay: dailyAvailabilityDelay(input.observationDelayHours),
    },
    settings,
  );
}
