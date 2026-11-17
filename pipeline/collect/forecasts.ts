// Collecte des prévisions : pour une ville, la prévision horaire de chaque modèle, dans le
// format interne. Un modèle qui ne répond pas est écarté et signalé ; il n'arrête rien.

import type { ConfiguredCity } from '../../shared/cities.ts';
import type { ConfiguredModel, ModelId } from '../../shared/models.ts';
import { toInstant } from '../instant.ts';
import type { CityForecasts, ModelForecast } from '../../shared/series.ts';
import { HttpStatusError, httpGet } from './http.ts';
import type { HttpOptions } from './http.ts';
import {
  UnattributedSeriesError,
  buildForecastUrl,
  parseForecastResponse,
} from './openMeteoForecast.ts';
import type { ParsedForecast, ParsedModel } from './openMeteoForecast.ts';

type Parsed = ParsedForecast<ConfiguredModel>;

export type CollectOptions = {
  readonly http: HttpOptions;
  readonly now: () => Date;
  /** Reçoit ce qui mérite d'être lu dans le journal du passage. */
  readonly log: (message: string) => void;
};

const BAD_REQUEST = 400;

/** Open-Meteo refuse la requête (modèle hors de son domaine, paramètre inconnu) et dit pourquoi. */
const isRefusal = (error: unknown): error is HttpStatusError =>
  error instanceof HttpStatusError && error.status === BAD_REQUEST;

async function request(
  city: ConfiguredCity,
  models: readonly ConfiguredModel[],
  options: CollectOptions,
): Promise<Parsed> {
  const response = await httpGet(buildForecastUrl(city, models), options.http);
  const body = await response.text();
  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch (error) {
    throw new Error(`Réponse d'Open-Meteo illisible pour ${city.name} : ce n'est pas du JSON`, {
      cause: error,
    });
  }
  return parseForecastResponse(json, models);
}

/** Une requête par modèle : le seul moyen de savoir lequel manque quand la requête groupée ne le dit pas. */
async function requestOneByOne(
  city: ConfiguredCity,
  models: readonly ConfiguredModel[],
  options: CollectOptions,
): Promise<Parsed> {
  const results: Parsed[] = [];
  for (const model of models) {
    try {
      results.push(await request(city, [model], options));
    } catch (error) {
      if (!isRefusal(error)) throw error;
      options.log(`${city.name} : ${model.name} refusé par Open-Meteo (${error.body.trim()})`);
      results.push({ models: [], missing: [model], missingSeries: [] });
    }
  }
  return {
    models: results.flatMap((result) => result.models),
    missing: results.flatMap((result) => result.missing),
    missingSeries: results.flatMap((result) => result.missingSeries),
  };
}

/** Un modèle sans aucune température à venir n'a rien à apporter à ce passage. */
function hasUpcomingTemperature(parsed: ParsedModel<ConfiguredModel>, now: Date): boolean {
  return parsed.times.some(
    (time, index) =>
      Date.parse(time) >= now.getTime() && (parsed.values.temperature[index] ?? null) !== null,
  );
}

/**
 * Prévisions de tous les modèles pour une ville. Lève une erreur si Open-Meteo ne répond
 * pas, si la réponse est mal formée ou si aucun modèle n'a de prévision.
 */
export async function collectForecasts(
  city: ConfiguredCity,
  models: readonly ConfiguredModel[],
  options: CollectOptions,
): Promise<CityForecasts> {
  const collectedAt = options.now();
  let parsed: Parsed;
  try {
    parsed = await request(city, models, options);
  } catch (error) {
    if (!(error instanceof UnattributedSeriesError) && !isRefusal(error)) throw error;
    options.log(`${city.name} : requête groupée inexploitable, reprise modèle par modèle`);
    parsed = await requestOneByOne(city, models, options);
  }

  for (const series of parsed.missingSeries) {
    options.log(`${city.name} : série absente, laissée vide : ${series}`);
  }
  const usable = parsed.models.filter((model) => hasUpcomingTemperature(model, collectedAt));
  const unavailable: ModelId[] = models
    .filter((model) => !usable.some((entry) => entry.model.id === model.id))
    .map((model) => model.id);
  for (const modelId of unavailable) options.log(`${city.name} : modèle indisponible : ${modelId}`);
  if (usable.length === 0) {
    throw new Error(`Aucun modèle n'a de prévision pour ${city.name}`);
  }

  const forecasts: ModelForecast[] = usable.map((entry) => ({
    modelId: entry.model.id,
    times: entry.times,
    values: entry.values,
    weatherCode: entry.weatherCode,
  }));
  return { cityId: city.id, collectedAt: toInstant(collectedAt), forecasts, unavailable };
}
