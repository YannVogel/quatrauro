// Rejoue l'indice de fiabilité quotidien et note, pour chaque jour, si la prévision a été tenue.
// Deux temps : on établit la situation de chaque jour (désaccord, signal de pluie, prévision
// tenue ou non), puis on rejoue l'indice sans fuite d'information.

import type { LeadGrouping } from '../../shared/blend/grouping.ts';
import {
  emptyReliabilityTable,
  reliabilityIndex,
  updateReliability,
} from '../../shared/blend/reliability.ts';
import type { ReliabilityOptions, Situation } from '../../shared/blend/reliability.ts';
import { dailyAvailabilityDelay, dailyMax, dailyMean, dailyMin } from './daily.ts';
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
  /** Nombre de modèles qui couvrent cette échéance. */
  readonly modelCount: number;
};

export type ReliabilityInput = {
  readonly byLead: ReadonlyMap<number, ReliabilityLeadInput>;
  /** Température observée, heure par heure. */
  readonly observedTemperature: Float64Array;
  /** Cumul de pluie observé, une valeur par jour. */
  readonly observedDailyRain: Float64Array;
  readonly observationDelayHours: number;
};

/** Pour chaque jour : 1 si le critère est rempli, 0 sinon, `NaN` s'il n'est pas vérifiable. */
export type HeldComponents = {
  readonly maximum: Float64Array;
  readonly minimum: Float64Array;
  readonly rain: Float64Array;
  /** Les trois critères à la fois. */
  readonly all: Float64Array;
};

/** Situation de chaque jour d'une échéance, et ce qu'il en est advenu. */
export type ReliabilityDays = {
  /** Écart-type moyen entre modèles sur la journée. */
  readonly spread: Float64Array;
  /** Probabilité de pluie du jour. */
  readonly rainProbability: Float64Array;
  /** 1 si la prévision du jour a été tenue, 0 sinon, `NaN` si elle n'est pas vérifiable. */
  readonly held: Float64Array;
  readonly modelCount: number;
};

export type ReliabilitySeries = ReliabilityDays & {
  /** Indice annoncé, de 0 à 1 ; `NaN` quand il est indisponible. */
  readonly index: Float64Array;
  readonly components: HeldComponents;
};

const asFlag = (verifiable: boolean, held: boolean): number =>
  verifiable ? (held ? 1 : 0) : Number.NaN;

/**
 * Une prévision est « tenue » si le minimum et le maximum du jour tombent dans la tolérance
 * et si l'annonce de pluie (oui ou non) est juste.
 */
export function heldDays(
  lead: ReliabilityLeadInput,
  input: ReliabilityInput,
  settings: ReliabilitySettings,
): HeldComponents {
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
    return asFlag(
      Number.isFinite(probability) && Number.isFinite(observed),
      announced === observed >= settings.rainThreshold,
    );
  });
  const all = maximum.map((max, day) => {
    const flags = [max, minimum[day] ?? Number.NaN, rain[day] ?? Number.NaN];
    return asFlag(
      flags.every((flag) => Number.isFinite(flag)),
      flags.every((flag) => flag === 1),
    );
  });
  return { maximum, minimum, rain, all };
}

export type ReplaySettings = {
  readonly leadGrouping: LeadGrouping;
  readonly options: ReliabilityOptions;
  readonly observationDelayHours: number;
};

/**
 * Indice de fiabilité de chaque jour, par échéance, tel qu'il aurait été annoncé : il ne
 * s'appuie que sur les jours déjà vérifiés au moment de l'émission.
 */
export function replayReliabilityIndex(
  byLead: ReadonlyMap<number, ReliabilityDays>,
  settings: ReplaySettings,
): Map<number, Float64Array> {
  const indices = new Map<number, Float64Array>();

  for (const leads of settings.leadGrouping) {
    const available = leads.filter((lead) => byLead.has(lead));
    if (available.length === 0) continue;
    const length = Math.max(...available.map((lead) => byLead.get(lead)?.held.length ?? 0));
    let table = emptyReliabilityTable(settings.options);
    for (const lead of available) indices.set(lead, new Float64Array(length).fill(Number.NaN));

    const situationOf = (lead: number, day: number): Situation | null => {
      const days = byLead.get(lead);
      const spread = days?.spread[day] ?? Number.NaN;
      const rainProbability = days?.rainProbability[day] ?? Number.NaN;
      if (days === undefined || !Number.isFinite(spread) || !Number.isFinite(rainProbability)) {
        return null;
      }
      return { spread, rainProbability, modelCount: days.modelCount };
    };

    replay({
      length,
      leads: available,
      stepsPerLeadDay: 1,
      availabilityDelay: dailyAvailabilityDelay(settings.observationDelayHours),
      learn: (day) => {
        for (const lead of available) {
          const held = byLead.get(lead)?.held[day] ?? Number.NaN;
          const situation = situationOf(lead, day);
          if (situation === null || !Number.isFinite(held)) continue;
          table = updateReliability(table, situation, held === 1, settings.options);
        }
      },
      predict: (lead, day) => {
        const situation = situationOf(lead, day);
        const index = indices.get(lead);
        if (situation === null || index === undefined) return;
        index[day] = reliabilityIndex(table, situation, settings.options) ?? Number.NaN;
      },
    });
  }
  return indices;
}

export function simulateReliability(
  input: ReliabilityInput,
  settings: ReliabilitySettings,
): Map<number, ReliabilitySeries> {
  const components = new Map<number, HeldComponents>();
  const days = new Map<number, ReliabilityDays>();
  for (const [lead, leadInput] of input.byLead) {
    const held = heldDays(leadInput, input, settings);
    components.set(lead, held);
    days.set(lead, {
      spread: dailyMean(leadInput.spread),
      rainProbability: leadInput.rainProbability,
      held: held.all,
      modelCount: leadInput.modelCount,
    });
  }
  const indices = replayReliabilityIndex(days, {
    leadGrouping: settings.leadGrouping,
    options: settings.options,
    observationDelayHours: input.observationDelayHours,
  });

  const results = new Map<number, ReliabilitySeries>();
  for (const [lead, leadDays] of days) {
    const index = indices.get(lead);
    const held = components.get(lead);
    if (index === undefined || held === undefined) continue;
    results.set(lead, { ...leadDays, index, components: held });
  }
  return results;
}
