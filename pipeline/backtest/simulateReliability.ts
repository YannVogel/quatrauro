// Rejoue l'indice de fiabilité quotidien et note, pour chaque jour, si la prévision a été tenue.

import { dailyAvailabilityDelay, dailyMax, dailyMean, dailyMin } from './daily.ts';
import type { LeadGrouping } from './logic/grouping.ts';
import { emptyReliabilityTable, reliabilityIndex, updateReliability } from './logic/reliability.ts';
import type { ReliabilityOptions, Situation } from './logic/reliability.ts';
import { replay } from './replay.ts';

export type ReliabilitySettings = {
  readonly leadGrouping: LeadGrouping;
  /** Écart toléré, en °C, sur le minimum et sur le maximum du jour. */
  readonly temperatureTolerance: number;
  /** Cumul quotidien à partir duquel c'est un jour de pluie, en mm. */
  readonly rainThreshold: number;
  readonly rainAnnouncementProbability: number;
  readonly options: ReliabilityOptions;
};

export type ReliabilityLeadInput = {
  /** Température mélangée, heure par heure. */
  readonly temperature: Float64Array;
  /** Écart-type entre modèles, heure par heure. */
  readonly spread: Float64Array;
  /** Probabilité de pluie du jour, une valeur par jour. */
  readonly rainProbability: Float64Array;
};

export type ReliabilityInput = {
  readonly byLead: ReadonlyMap<number, ReliabilityLeadInput>;
  /** Température observée, heure par heure. */
  readonly observedTemperature: Float64Array;
  /** Cumul de pluie observé, une valeur par jour. */
  readonly observedDailyRain: Float64Array;
  readonly observationDelayHours: number;
};

export type ReliabilitySeries = {
  /** Indice annoncé, de 0 à 1 ; `NaN` quand il est indisponible. */
  readonly index: Float64Array;
  /** 1 si la prévision du jour a été tenue, 0 sinon, `NaN` si elle n'est pas vérifiable. */
  readonly held: Float64Array;
  readonly components: HeldComponents;
  /** Écart-type moyen entre modèles sur la journée. */
  readonly spread: Float64Array;
};

/** Pour chaque jour : 1 si le critère est rempli, 0 sinon, `NaN` s'il n'est pas vérifiable. */
export type HeldComponents = {
  readonly maximum: Float64Array;
  readonly minimum: Float64Array;
  readonly rain: Float64Array;
  /** Les trois critères à la fois. */
  readonly all: Float64Array;
};

const asFlag = (verifiable: boolean, held: boolean): number => (verifiable ? (held ? 1 : 0) : Number.NaN);

/**
 * Une prévision est « tenue » si le minimum et le maximum du jour tombent dans la tolérance
 * et si l'annonce de pluie (oui ou non) est juste.
 */
export function heldDays(lead: ReliabilityLeadInput, input: ReliabilityInput, settings: ReliabilitySettings): HeldComponents {
  const forecastMax = dailyMax(lead.temperature);
  const forecastMin = dailyMin(lead.temperature);
  const observedMax = dailyMax(input.observedTemperature);
  const observedMin = dailyMin(input.observedTemperature);
  const maximum = forecastMax.map((max, day) => {
    const error = Math.abs(max - (observedMax[day] ?? Number.NaN));
    return asFlag(Number.isFinite(error), error <= settings.temperatureTolerance);
  });
  const minimum = forecastMin.map((min, day) => {
    const error = Math.abs(min - (observedMin[day] ?? Number.NaN));
    return asFlag(Number.isFinite(error), error <= settings.temperatureTolerance);
  });
  const rain = lead.rainProbability.map((probability, day) => {
    const observed = input.observedDailyRain[day] ?? Number.NaN;
    const announced = probability >= settings.rainAnnouncementProbability;
    return asFlag(Number.isFinite(probability) && Number.isFinite(observed), announced === observed >= settings.rainThreshold);
  });
  const all = maximum.map((max, day) => {
    const flags = [max, minimum[day] ?? Number.NaN, rain[day] ?? Number.NaN];
    return asFlag(flags.every((flag) => Number.isFinite(flag)), flags.every((flag) => flag === 1));
  });
  return { maximum, minimum, rain, all };
}

export function simulateReliability(input: ReliabilityInput, settings: ReliabilitySettings): Map<number, ReliabilitySeries> {
  const days = input.observedDailyRain.length;
  const results = new Map<number, ReliabilitySeries>();

  for (const leads of settings.leadGrouping) {
    const available = leads.filter((lead) => input.byLead.has(lead));
    if (available.length === 0) continue;
    let table = emptyReliabilityTable(settings.options);

    for (const lead of available) {
      const leadInput = input.byLead.get(lead);
      if (leadInput === undefined) continue;
      const components = heldDays(leadInput, input, settings);
      results.set(lead, {
        index: new Float64Array(days).fill(Number.NaN),
        held: components.all,
        components,
        spread: dailyMean(leadInput.spread),
      });
    }

    const situationOf = (lead: number, day: number): Situation | null => {
      const spread = results.get(lead)?.spread[day] ?? Number.NaN;
      const rainProbability = input.byLead.get(lead)?.rainProbability[day] ?? Number.NaN;
      return Number.isFinite(spread) && Number.isFinite(rainProbability) ? { spread, rainProbability } : null;
    };

    replay({
      length: days,
      leads: available,
      stepsPerLeadDay: 1,
      availabilityDelay: dailyAvailabilityDelay(input.observationDelayHours),
      learn: (day) => {
        for (const lead of available) {
          const held = results.get(lead)?.held[day] ?? Number.NaN;
          const situation = situationOf(lead, day);
          if (situation === null || !Number.isFinite(held)) continue;
          table = updateReliability(table, situation, held === 1, settings.options);
        }
      },
      predict: (lead, day) => {
        const situation = situationOf(lead, day);
        const result = results.get(lead);
        if (situation === null || result === undefined) return;
        result.index[day] = reliabilityIndex(table, situation, settings.options) ?? Number.NaN;
      },
    });
  }
  return results;
}
