// Scénario fictif pour les tests du pipeline : un « vrai temps » simple et des modèles qui
// s'en écartent chacun d'un biais constant. Ces chiffres sont inventés pour les tests : ils ne
// décrivent ni Toulon ni Nice, et ne doivent jamais sortir d'ici.

import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { CityId } from '../../shared/cities.ts';
import type { ModelId } from '../../shared/models.ts';
import type { CityForecasts, ModelForecast, Observations } from '../../shared/series.ts';
import { FORECAST_VARIABLES } from '../../shared/variables.ts';
import type { ForecastVariable } from '../../shared/variables.ts';
import type { Measures } from '../archive/observations.ts';
import type { History } from '../bootstrap/replay.ts';
import { DAY_MS, HOUR_MS, floorToHour, toInstant } from '../instant.ts';

const FORECAST_HOURS = 192;
const round1 = (value: number): number => Math.round(value * 10) / 10;

/** Écart constant de chaque modèle à la température vraie, en °C. */
export const MODEL_BIAS: Readonly<Record<ModelId, number>> = {
  arome: 0.4,
  arpege: -1,
  ifs: 0.2,
  icon: 1.5,
  gfs: -2,
};
/** Portée de chaque modèle fictif, en heures après la collecte. */
const HORIZON_HOURS: Readonly<Record<ModelId, number>> = {
  arome: 48,
  arpege: 96,
  ifs: 192,
  icon: 192,
  gfs: 192,
};

/**
 * Erreur de chaque modèle qu'aucune correction ne rattrape, en °C : elle change de signe d'un
 * jour à l'autre. Elle n'est appliquée que si le scénario est « bruité ».
 */
export const MODEL_NOISE: Readonly<Record<ModelId, number>> = {
  arome: 0.3,
  arpege: 0.8,
  ifs: 0.5,
  icon: 1.2,
  gfs: 2,
};

const dayOf = (time: number): number => Math.floor(time / DAY_MS);

/** Température qu'un modèle du scénario prévoit pour une heure. */
function modelTemperature(modelId: ModelId, time: number, noisy: boolean): number {
  const noise = noisy ? MODEL_NOISE[modelId] * (dayOf(time) % 2 === 0 ? 1 : -1) : 0;
  return round1(truthAt(time).temperature + MODEL_BIAS[modelId] + noise);
}
/** Il pleut un jour (UTC) sur quatre, de 10 h à 16 h UTC. */
const rainsAt = (time: number): boolean => {
  const hour = new Date(time).getUTCHours();
  return dayOf(time) % 4 === 0 && hour >= 10 && hour < 16;
};

/** Le temps « vrai » du scénario à une heure donnée. */
export function truthAt(time: number): Record<ForecastVariable, number> {
  const hour = new Date(time).getUTCHours();
  return {
    temperature: 15 + 5 * Math.sin(((hour - 9) / 24) * 2 * Math.PI) + (dayOf(time) % 5) * 0.5,
    humidity: 60 + (hour % 6),
    windSpeed: 12 + (hour % 4),
    windGusts: 25 + (hour % 5),
    windDirection: 270,
    cloudCover: rainsAt(time) ? 90 : 20,
    precipitation: rainsAt(time) ? 2 : 0,
  };
}

export type ScenarioOptions = {
  /** Modèles absents de la collecte. */
  readonly withoutModels?: readonly ModelId[];
  /** Ajoute à chaque modèle son erreur non corrigeable (`MODEL_NOISE`). */
  readonly noisy?: boolean;
};

/** Ce qu'Open-Meteo aurait rendu à cet instant : 192 heures à partir du début du jour UTC. */
export function forecastsAt(
  cityId: CityId,
  collectedAt: number,
  options: ScenarioOptions = {},
): CityForecasts {
  const start = Math.floor(collectedAt / DAY_MS) * DAY_MS;
  const times = Array.from({ length: FORECAST_HOURS }, (_, index) => start + index * HOUR_MS);
  const modelIds = (Object.keys(MODEL_BIAS) as ModelId[]).filter(
    (modelId) => !(options.withoutModels ?? []).includes(modelId),
  );
  const forecasts: ModelForecast[] = modelIds.map((modelId) => {
    const inRange = (time: number): boolean =>
      time <= floorToHour(collectedAt) + HORIZON_HOURS[modelId] * HOUR_MS;
    return {
      modelId,
      times: times.map((time) => toInstant(time)),
      values: Object.fromEntries(
        FORECAST_VARIABLES.map((variable) => [
          variable,
          times.map((time) => {
            if (!inRange(time)) return null;
            return variable === 'temperature'
              ? modelTemperature(modelId, time, options.noisy ?? false)
              : truthAt(time)[variable];
          }),
        ]),
      ) as Record<ForecastVariable, (number | null)[]>,
      weatherCode: times.map((time) => (inRange(time) ? (rainsAt(time) ? 61 : 1) : null)),
    };
  });
  return {
    cityId,
    collectedAt: toInstant(collectedAt),
    forecasts,
    unavailable: (options.withoutModels ?? []) as ModelId[],
  };
}

/** Les mesures publiées à cet instant : elles s'arrêtent `delayHours` plus tôt. */
export function observationsAt(
  collectedAt: number,
  options: {
    readonly lookbackDays?: number;
    readonly delayHours?: number;
    /** Heures que la station n'a jamais mesurées. */
    readonly missing?: (time: number) => boolean;
  } = {},
): Observations {
  const last = floorToHour(collectedAt) - (options.delayHours ?? 27) * HOUR_MS;
  const first = floorToHour(collectedAt) - (options.lookbackDays ?? 10) * DAY_MS;
  const times: number[] = [];
  for (let time = first; time <= floorToHour(collectedAt); time += HOUR_MS) times.push(time);
  return {
    stationId: '00000000',
    times: times.map((time) => toInstant(time)),
    values: Object.fromEntries(
      FORECAST_VARIABLES.map((variable) => [
        variable,
        times.map((time) =>
          time > last || options.missing?.(time) === true ? null : round1(truthAt(time)[variable]),
        ),
      ]),
    ) as Record<ForecastVariable, (number | null)[]>,
  };
}

/** Les mesures du scénario à une heure, telles que la station les publierait. */
export function measuresAt(time: number): Measures {
  const truth = truthAt(time);
  return Object.fromEntries(
    FORECAST_VARIABLES.map((variable) => [variable, round1(truth[variable])]),
  ) as Record<ForecastVariable, number>;
}

/**
 * L'historique du scénario, tel que l'amorçage le lit : ce que chaque modèle prévoyait pour
 * une heure, à chaque échéance qu'il couvre, et toutes les mesures.
 */
export function historyOf(firstHour: number, days: number, options: ScenarioOptions = {}): History {
  const lastHour = firstHour + days * DAY_MS - HOUR_MS;
  const observations = new Map<number, Measures>();
  for (let time = firstHour; time <= lastHour; time += HOUR_MS) {
    observations.set(time, measuresAt(time));
  }
  const modelIds = (Object.keys(MODEL_BIAS) as ModelId[]).filter(
    (modelId) => !(options.withoutModels ?? []).includes(modelId),
  );
  return {
    firstHour,
    lastHour,
    observations,
    modelsAt: (time, lead) =>
      modelIds
        .filter((modelId) => lead * 24 <= HORIZON_HOURS[modelId])
        .map((modelId) => ({
          modelId,
          values: {
            ...truthAt(time),
            temperature: modelTemperature(modelId, time, options.noisy ?? false),
          },
        })),
  };
}

/** Dossier temporaire, effacé par `cleanup`. */
export async function temporaryDirectory(): Promise<{
  readonly root: string;
  readonly cleanup: () => Promise<void>;
}> {
  const root = await mkdtemp(path.join(tmpdir(), 'quatrauro-'));
  return { root, cleanup: () => rm(root, { recursive: true, force: true }) };
}

/** Tous les fichiers d'un dossier, avec leur contenu : pour comparer deux états du stockage. */
export async function snapshot(root: string): Promise<Record<string, string>> {
  const files: Record<string, string> = {};
  const walk = async (directory: string): Promise<void> => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      else files[path.relative(root, absolute)] = await readFile(absolute, 'utf8');
    }
  };
  await walk(root);
  return files;
}
