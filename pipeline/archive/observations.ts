// Archive des observations : un fichier par ville et par mois (UTC), une ligne par heure. Elle
// est en ajout seul : une mesure archivée n'est jamais remplacée, une heure vide peut se
// remplir quand la mesure arrive enfin.

import { z } from 'zod';

import { CITY_IDS } from '../../shared/cities.ts';
import type { CityId } from '../../shared/cities.ts';
import type { Observations } from '../../shared/series.ts';
import { FORECAST_VARIABLES } from '../../shared/variables.ts';
import type { ForecastVariable } from '../../shared/variables.ts';
import { toInstant, utcDateOf } from '../instant.ts';
import { readJson, writeJson } from '../storage.ts';
import type { Storage } from '../storage.ts';

export const OBSERVATIONS_SCHEMA_VERSION = 1;

export type Measures = Readonly<Record<ForecastVariable, number | null>>;
/** Mesures par instant (millisecondes). Une heure sans aucune mesure n'y figure pas. */
export type ObservationIndex = ReadonlyMap<number, Measures>;

const fileSchema = z.object({
  schemaVersion: z.literal(OBSERVATIONS_SCHEMA_VERSION),
  city: z.enum(CITY_IDS),
  stationId: z.string(),
  /** `AAAA-MM`. */
  month: z.string().regex(/^\d{4}-\d{2}$/),
  /** Dans l'ordre de `variables`, une valeur par grandeur. */
  variables: z.array(z.enum(FORECAST_VARIABLES)),
  hours: z.record(z.iso.datetime(), z.array(z.number().nullable())),
});

type ObservationFile = z.infer<typeof fileSchema>;

const monthOf = (time: number): string => utcDateOf(time).slice(0, 7);
const fileOf = (cityId: CityId, month: string): string =>
  `archive/observations/${cityId}/${month}.json`;

function measuresOf(file: ObservationFile, values: readonly (number | null)[]): Measures {
  return Object.fromEntries(
    FORECAST_VARIABLES.map((variable) => [
      variable,
      values[file.variables.indexOf(variable)] ?? null,
    ]),
  ) as Record<ForecastVariable, number | null>;
}

/**
 * Ajoute des mesures à l'archive. Rend le nombre de valeurs nouvelles : zéro quand tout y
 * était déjà, et alors aucun fichier n'est réécrit.
 */
export async function archiveObservations(
  storage: Storage,
  cityId: CityId,
  observations: Observations,
): Promise<number> {
  const months = new Map<string, number[]>();
  observations.times.forEach((time, index) => {
    const month = monthOf(Date.parse(time));
    months.set(month, [...(months.get(month) ?? []), index]);
  });

  let added = 0;
  for (const [month, indices] of months) {
    const existing = await readJson(storage, fileOf(cityId, month), fileSchema);
    const hours = new Map<string, Measures>(
      Object.entries(existing?.hours ?? {}).map(([time, values]) => [
        time,
        measuresOf(existing as ObservationFile, values),
      ]),
    );
    let addedThisMonth = 0;
    for (const index of indices) {
      const time = observations.times[index] ?? '';
      const known = hours.get(time);
      const merged = Object.fromEntries(
        FORECAST_VARIABLES.map((variable) => {
          const before = known?.[variable] ?? null;
          const received = observations.values[variable][index] ?? null;
          if (before === null && received !== null) addedThisMonth += 1;
          return [variable, before ?? received];
        }),
      ) as Record<ForecastVariable, number | null>;
      if (Object.values(merged).some((value) => value !== null)) hours.set(time, merged);
    }
    if (addedThisMonth === 0) continue;
    added += addedThisMonth;
    const file: ObservationFile = {
      schemaVersion: OBSERVATIONS_SCHEMA_VERSION,
      city: cityId,
      stationId: observations.stationId,
      month,
      variables: [...FORECAST_VARIABLES],
      hours: Object.fromEntries(
        [...hours]
          .sort(([first], [second]) => first.localeCompare(second))
          .map(([time, measures]) => [
            time,
            FORECAST_VARIABLES.map((variable) => measures[variable]),
          ]),
      ),
    };
    await writeJson(storage, fileOf(cityId, month), file);
  }
  return added;
}

/** Mesures archivées entre deux instants (bornes comprises). */
export async function readObservations(
  storage: Storage,
  cityId: CityId,
  from: number,
  to: number,
): Promise<ObservationIndex> {
  const index = new Map<number, Measures>();
  const months: string[] = [];
  const cursor = new Date(`${monthOf(from)}-01T00:00:00Z`);
  while (cursor.getTime() <= to) {
    months.push(monthOf(cursor.getTime()));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  for (const month of months) {
    const file = await readJson(storage, fileOf(cityId, month), fileSchema);
    if (file === null) continue;
    for (const [time, values] of Object.entries(file.hours)) {
      const instant = Date.parse(time);
      if (instant >= from && instant <= to) index.set(instant, measuresOf(file, values));
    }
  }
  return index;
}

/** Instant le plus récent de l'archive qui porte une température, ou `null`. Sert au journal. */
export function lastObservedInstant(index: ObservationIndex): string | null {
  const times = [...index].filter(([, measures]) => measures.temperature !== null).map(([t]) => t);
  return times.length === 0 ? null : toInstant(Math.max(...times));
}
