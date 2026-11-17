// Requête de prévision d'Open-Meteo et lecture de sa réponse. Documentation :
// https://open-meteo.com/en/docs (lue le 17/11/2026). Une requête porte une ville et tous les
// modèles ; chaque série revient suffixée par l'identifiant de son modèle
// (`temperature_2m_ecmwf_ifs`), sauf quand un seul modèle répond.

import { z } from 'zod';

import type { City } from '../../shared/cities.ts';
import type { Model } from '../../shared/models.ts';
import type { HourlySeries } from '../../shared/series.ts';
import { FORECAST_VARIABLES } from '../../shared/variables.ts';
import type { ForecastVariable } from '../../shared/variables.ts';
import { OPEN_METEO_NAMES, OPEN_METEO_UNITS, OPEN_METEO_WEATHER_CODE } from '../openMeteoNames.ts';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
/**
 * Huit jours UTC à partir d'aujourd'hui : de quoi couvrir sept jours civils de Paris, même
 * quand le passage a lieu en fin de soirée.
 */
const FORECAST_DAYS = 8;
const HOUR_MS = 3_600_000;

export function buildForecastUrl(city: City, models: readonly Model[]): string {
  const query = new URLSearchParams({
    latitude: String(city.latitude),
    longitude: String(city.longitude),
    hourly: [
      ...FORECAST_VARIABLES.map((variable) => OPEN_METEO_NAMES[variable]),
      OPEN_METEO_WEATHER_CODE.name,
    ].join(','),
    models: models.map((model) => model.openMeteoId).join(','),
    forecast_days: String(FORECAST_DAYS),
    timezone: 'GMT',
    temperature_unit: 'celsius',
    wind_speed_unit: 'kmh',
    precipitation_unit: 'mm',
  });
  return `${FORECAST_URL}?${query.toString()}`;
}

/** Heure d'Open-Meteo avec `timezone=GMT` : `2026-11-17T15:00`, sans décalage. */
const OPEN_METEO_HOUR = /^\d{4}-\d{2}-\d{2}T\d{2}:00$/;

const responseSchema = z.object({
  utc_offset_seconds: z.literal(0),
  hourly_units: z.record(z.string(), z.string()),
  hourly: z
    .object({ time: z.array(z.string().regex(OPEN_METEO_HOUR)).min(1) })
    .catchall(z.array(z.number().nullable())),
});

type Hourly = z.infer<typeof responseSchema>['hourly'];

/**
 * Plusieurs modèles étaient demandés et les séries reviennent sans suffixe : un seul a
 * répondu, et rien ne dit lequel. Il faut redemander modèle par modèle.
 */
export class UnattributedSeriesError extends Error {
  constructor() {
    super(
      'Open-Meteo a rendu des séries sans nom de modèle : impossible de savoir à qui elles sont',
    );
    this.name = 'UnattributedSeriesError';
  }
}

export type ParsedModel<M extends Model = Model> = HourlySeries & {
  readonly model: M;
  readonly weatherCode: readonly (number | null)[];
};

export type ParsedForecast<M extends Model = Model> = {
  readonly models: readonly ParsedModel<M>[];
  /** Modèles demandés dont la réponse ne contient aucune série. */
  readonly missing: readonly M[];
  /** Séries attendues et absentes chez un modèle par ailleurs présent : elles valent `null`. */
  readonly missingSeries: readonly string[];
};

function toUtcTimes(times: readonly string[]): string[] {
  const instants = times.map((time) => `${time}:00Z`);
  instants.forEach((instant, index) => {
    const previous = instants[index - 1];
    if (previous !== undefined && Date.parse(instant) - Date.parse(previous) !== HOUR_MS) {
      throw new Error(`Heures d'Open-Meteo non consécutives : ${previous} puis ${instant}`);
    }
  });
  return instants;
}

type Expected = { readonly name: string; readonly unit: string };

/**
 * Lit la réponse d'une requête de prévision. Toute forme inattendue (bloc manquant, unité
 * différente, série de mauvaise longueur) lève une erreur : jamais de valeur devinée.
 */
export function parseForecastResponse<M extends Model>(
  response: unknown,
  requested: readonly M[],
): ParsedForecast<M> {
  const parsed = responseSchema.safeParse(response);
  if (!parsed.success) {
    throw new Error(`Réponse d'Open-Meteo mal formée : ${z.prettifyError(parsed.error)}`);
  }
  const { hourly, hourly_units: units } = parsed.data;
  const times = toUtcTimes(hourly.time);
  const nulls: readonly null[] = times.map(() => null);
  const isSuffixed = requested.some((model) =>
    Object.keys(hourly).some((key) => key.endsWith(`_${model.openMeteoId}`)),
  );
  if (!isSuffixed && requested.length > 1 && OPEN_METEO_NAMES.temperature in hourly) {
    throw new UnattributedSeriesError();
  }

  const missingSeries: string[] = [];
  const read = (expected: Expected, model: Model): readonly (number | null)[] | null => {
    const key = isSuffixed ? `${expected.name}_${model.openMeteoId}` : expected.name;
    const values = (hourly as Hourly & Record<string, unknown>)[key];
    if (values === undefined) return null;
    if (!Array.isArray(values) || values.length !== times.length) {
      throw new Error(`Série « ${key} » de longueur inattendue : ${times.length} heures attendues`);
    }
    if (units[key] !== expected.unit) {
      throw new Error(
        `Unité inattendue pour « ${key} » : ${units[key] ?? 'aucune'} au lieu de ${expected.unit}`,
      );
    }
    return values as readonly (number | null)[];
  };

  const models: ParsedModel<M>[] = [];
  const missing: M[] = [];
  for (const model of requested) {
    const series = FORECAST_VARIABLES.map(
      (variable) =>
        [
          variable,
          read({ name: OPEN_METEO_NAMES[variable], unit: OPEN_METEO_UNITS[variable] }, model),
        ] as const,
    );
    const weatherCode = read(OPEN_METEO_WEATHER_CODE, model);
    if (series.every(([, values]) => values === null) && weatherCode === null) {
      missing.push(model);
      continue;
    }
    for (const [variable, values] of series) {
      if (values === null) missingSeries.push(`${OPEN_METEO_NAMES[variable]} (${model.id})`);
    }
    models.push({
      model,
      times,
      values: Object.fromEntries(
        series.map(([variable, values]) => [variable, values ?? nulls]),
      ) as Record<ForecastVariable, readonly (number | null)[]>,
      weatherCode: weatherCode ?? nulls,
    });
  }
  return { models, missing, missingSeries };
}
