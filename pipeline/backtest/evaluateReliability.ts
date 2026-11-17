// Prépare et évalue l'indice de fiabilité d'une ville : l'indice annoncé est-il tenu dans la
// proportion annoncée ?

import { BLEND_CONFIG } from '../../shared/blendConfig.ts';
import type { Model } from '../../shared/models.ts';
import type { CityData } from './data/dataset.ts';
import { HOURS_PER_DAY } from './data/hours.ts';
import { dailySum } from './daily.ts';
import { buildInput, leadsToEvaluate, positionsOf } from './evaluate.ts';
import type { DateRange } from './evaluate.ts';
import type { BlendParams } from './logic/params.ts';
import { simulateBlend } from './simulate.ts';
import { simulateDailyRain } from './simulateRain.ts';
import type { RainSettings } from './simulateRain.ts';
import { simulateReliability } from './simulateReliability.ts';
import type { ReliabilitySeries, ReliabilitySettings } from './simulateReliability.ts';

export type ReliabilityRun = {
  readonly data: CityData;
  readonly byLead: ReadonlyMap<number, ReliabilitySeries>;
};

export function runReliability(
  data: CityData,
  models: readonly Model[],
  params: BlendParams,
  rainSettings: RainSettings,
  settings: ReliabilitySettings,
): ReliabilityRun {
  const temperature = buildInput(data, 'temperature', models);
  const precipitation = buildInput(data, 'precipitation', models);
  const blend = simulateBlend(temperature, params);
  const rain = simulateDailyRain(precipitation, rainSettings);
  const byLead = new Map(
    leadsToEvaluate(models).map((lead) => {
      const leadBlend = blend.get(lead);
      const leadRain = rain.get(lead);
      if (leadBlend === undefined || leadRain === undefined)
        throw new Error(`Échéance J+${lead} non simulée`);
      return [
        lead,
        {
          temperature: leadBlend.blend,
          spread: leadBlend.spread,
          rainProbability: leadRain.probability,
        },
      ] as const;
    }),
  );
  return {
    data,
    byLead: simulateReliability(
      {
        byLead,
        observedTemperature: temperature.observation,
        observedDailyRain: dailySum(precipitation.observation),
        observationDelayHours: BLEND_CONFIG.observationDelayHours,
      },
      settings,
    ),
  };
}

/** Jours de l'intervalle, bornes comprises, en positions de la série quotidienne. */
export function daysOf(run: ReliabilityRun, range: DateRange): number[] {
  const { from, to } = positionsOf(run.data.axis, range);
  const days: number[] = [];
  for (let day = Math.max(from / HOURS_PER_DAY, 0); day < to / HOURS_PER_DAY; day += 1)
    days.push(day);
  return days;
}

/** Valeurs finies d'une série quotidienne sur un intervalle. */
export function valuesOn(series: Float64Array, days: readonly number[]): number[] {
  return days.map((day) => series[day] ?? Number.NaN).filter((value) => Number.isFinite(value));
}

/** Couples (indice annoncé, prévision tenue) des jours où les deux sont connus. */
export function verifiedDays(
  series: ReliabilitySeries,
  days: readonly number[],
): { readonly announced: number[]; readonly outcomes: boolean[] } {
  const announced: number[] = [];
  const outcomes: boolean[] = [];
  for (const day of days) {
    const index = series.index[day] ?? Number.NaN;
    const held = series.held[day] ?? Number.NaN;
    if (!Number.isFinite(index) || !Number.isFinite(held)) continue;
    announced.push(index);
    outcomes.push(held === 1);
  }
  return { announced, outcomes };
}

export const mean = (values: readonly number[]): number =>
  values.length === 0 ? Number.NaN : values.reduce((sum, value) => sum + value, 0) / values.length;

/** Tercile d'une liste de valeurs (`fraction` = 1/3 ou 2/3). */
export function quantile(values: readonly number[], fraction: number): number {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(fraction * (sorted.length - 1))] ?? Number.NaN;
}
