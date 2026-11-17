// Agrégats par jour UTC d'une série horaire. Un jour auquel il manque une heure n'a pas
// d'agrégat : mieux vaut un jour absent qu'un cumul ou un maximum faux.

import { HOURS_PER_DAY } from './data/hours.ts';

function aggregateDaily(
  series: Float64Array,
  combine: (hours: Float64Array) => number,
): Float64Array {
  const days = Math.floor(series.length / HOURS_PER_DAY);
  const result = new Float64Array(days).fill(Number.NaN);
  for (let day = 0; day < days; day += 1) {
    const hours = series.subarray(day * HOURS_PER_DAY, (day + 1) * HOURS_PER_DAY);
    if (hours.every((value) => Number.isFinite(value))) result[day] = combine(hours);
  }
  return result;
}

const sum = (hours: Float64Array): number => hours.reduce((total, value) => total + value, 0);

export const dailySum = (series: Float64Array): Float64Array => aggregateDaily(series, sum);
export const dailyMean = (series: Float64Array): Float64Array =>
  aggregateDaily(series, (hours) => sum(hours) / hours.length);
export const dailyMax = (series: Float64Array): Float64Array =>
  aggregateDaily(series, (hours) => Math.max(...hours));
export const dailyMin = (series: Float64Array): Float64Array =>
  aggregateDaily(series, (hours) => Math.min(...hours));

/** Nombre de jours entre une observation quotidienne et sa publication, pour un délai horaire donné. */
export function dailyAvailabilityDelay(observationDelayHours: number): number {
  return Math.ceil((HOURS_PER_DAY - 1 + observationDelayHours) / HOURS_PER_DAY);
}
