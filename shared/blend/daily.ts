// Agrégats d'un jour civil de Paris à partir des heures mélangées : minimum, maximum, cumul,
// vent le plus fort. Un jour dont trop d'heures manquent n'a pas d'agrégat : un minimum
// calculé sur une demi-journée serait une valeur inventée.

import { parisDateKey, parisDayLengthHours } from '../parisTime.ts';

export type HourlyPoint = {
  /** Heure ronde, en UTC, au format ISO. */
  readonly time: string;
  readonly temperature: number | null;
  readonly apparentTemperature: number | null;
  readonly humidity: number | null;
  readonly windSpeed: number | null;
  readonly windGusts: number | null;
  readonly precipitation: number | null;
};

export type DailyAggregate = {
  /** Jour civil de Paris, `AAAA-MM-JJ`. */
  readonly date: string;
  readonly min: number | null;
  readonly max: number | null;
  readonly apparentMin: number | null;
  readonly apparentMax: number | null;
  /** Cumul de pluie du jour, en mm. */
  readonly precipitation: number | null;
  readonly windSpeedMax: number | null;
  readonly windGustsMax: number | null;
  /** Humidité moyenne du jour. */
  readonly humidity: number | null;
};

type Field = Exclude<keyof HourlyPoint, 'time'>;

/**
 * Agrégats par jour civil de Paris, dans l'ordre. `minCoverage` est la part des heures du
 * jour (23, 24 ou 25) qu'une variable doit couvrir pour avoir un agrégat ; en dessous, `null`.
 */
export function aggregateDaily(
  hours: readonly HourlyPoint[],
  minCoverage: number,
): DailyAggregate[] {
  const byDay = new Map<string, HourlyPoint[]>();
  for (const hour of hours) {
    const date = parisDateKey(new Date(hour.time));
    byDay.set(date, [...(byDay.get(date) ?? []), hour]);
  }

  return [...byDay]
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([date, points]) => {
      const required = parisDayLengthHours(date) * minCoverage;
      const valuesOf = (field: Field): number[] | null => {
        const values = points.flatMap((point) => {
          const value = point[field];
          return value === null ? [] : [value];
        });
        return values.length === 0 || values.length < required ? null : values;
      };
      const reduce = (field: Field, combine: (values: number[]) => number): number | null => {
        const values = valuesOf(field);
        return values === null ? null : combine(values);
      };
      const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0);
      const max = (values: number[]): number => Math.max(...values);
      const min = (values: number[]): number => Math.min(...values);

      return {
        date,
        min: reduce('temperature', min),
        max: reduce('temperature', max),
        apparentMin: reduce('apparentTemperature', min),
        apparentMax: reduce('apparentTemperature', max),
        precipitation: reduce('precipitation', sum),
        windSpeedMax: reduce('windSpeed', max),
        windGustsMax: reduce('windGusts', max),
        humidity: reduce('humidity', (values) => sum(values) / values.length),
      };
    });
}
