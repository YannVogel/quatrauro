// Construit `forecast/<ville>.json` : la prévision des sept prochains jours, heure par heure
// et jour par jour, à partir des prévisions collectées et de l'état de la ville. Tout le
// calcul vient de `shared/` ; ici on ne fait qu'assembler et arrondir.

import {
  announcesThunderstorm,
  dayCondition,
  hourCondition,
} from '../../shared/blend/condition.ts';
import type { ConditionSettings } from '../../shared/blend/condition.ts';
import { aggregateDaily } from '../../shared/blend/daily.ts';
import { rainAgreement, rainProbability } from '../../shared/blend/rain.ts';
import { dayReliability } from '../../shared/blend/reliability.ts';
import { daySummary } from '../../shared/blend/summary.ts';
import { BLEND_CONFIG, MAX_LEAD_DAYS } from '../../shared/blendConfig.ts';
import type { ConfiguredCity } from '../../shared/cities.ts';
import type { Condition } from '../../shared/conditions.ts';
import { MODELS } from '../../shared/models.ts';
import type { ModelId } from '../../shared/models.ts';
import { parisDateKey } from '../../shared/parisTime.ts';
import { SCHEMA_VERSION } from '../../shared/schemas.ts';
import type { DailyForecast, ForecastFile, HourlyForecast } from '../../shared/schemas.ts';
import type { CityForecasts } from '../../shared/series.ts';
import { isNight } from '../../shared/sun.ts';
import { blendAt, indexForecasts, leadOf } from '../blend/hour.ts';
import type { BlendedHour, ForecastIndex } from '../blend/hour.ts';
import { roundTo } from '../config.ts';
import { toInstant } from '../instant.ts';
import { bucketOf } from '../state/cityState.ts';
import type { CityState } from '../state/cityState.ts';
import { hoursOfParisDay, nextParisDay } from '../verify/learn.ts';

const { rain: RAIN, reliability: RELIABILITY } = BLEND_CONFIG;
const CONDITION_SETTINGS: ConditionSettings = {
  ...BLEND_CONFIG.condition,
  hourlyAnnouncement: RAIN.hourlyAnnouncement,
  dailyAnnouncement: RAIN.dailyAnnouncement,
};
const SUMMARY_SETTINGS = { ...BLEND_CONFIG.condition, ...BLEND_CONFIG.summary };
const RELIABILITY_SETTINGS = {
  ...RELIABILITY,
  agreementTolerance: RELIABILITY.agreementTolerance.temperature,
};
const RAIN_OPTIONS = { priorStrength: RAIN.priorStrength, minSamples: RAIN.minSamples };
const PERCENT = 100;

const rounded = (value: number | null, decimals: number): number | null =>
  value === null ? null : roundTo(value, decimals);
const sum = (values: readonly number[]): number =>
  values.reduce((total, value) => total + value, 0);

/** Une heure publiée, avec ce dont le jour a encore besoin et que le fichier ne porte pas. */
type Hour = {
  readonly blended: BlendedHour;
  readonly condition: Condition | null;
  readonly isNight: boolean;
};

function blendHourAt(
  index: ForecastIndex,
  state: CityState,
  city: ConfiguredCity,
  time: number,
  collectedAt: number,
): Hour | null {
  const blended = blendAt(index, state, time, leadOf(time, collectedAt));
  if (blended === null) return null;
  const { blend } = blended;
  return {
    blended,
    isNight: isNight(new Date(time), city),
    condition: hourCondition(
      {
        cloudCover: blend.cloudCover,
        precipitationProbability: blend.precipitationProbability,
        temperature: blend.temperature,
        windSpeed: blend.windSpeed,
        windGusts: blend.windGusts,
        thunderstorm: announcesThunderstorm(index.weatherCodesAt(time)),
      },
      CONDITION_SETTINGS,
    ),
  };
}

function toHourly(hour: Hour): HourlyForecast {
  const { blend, models, time } = hour.blended;
  return {
    time: toInstant(time),
    temperature: rounded(blend.temperature, 1),
    temperatureSpread: rounded(blend.temperatureSpread, 2),
    apparentTemperature: rounded(blend.apparentTemperature, 1),
    humidity: rounded(blend.humidity, 0),
    cloudCover: rounded(blend.cloudCover, 0),
    precipitation: rounded(blend.precipitation, 1),
    precipitationProbability:
      blend.precipitationProbability === null
        ? null
        : roundTo(blend.precipitationProbability * PERCENT, 0),
    windSpeed: rounded(blend.windSpeed, 0),
    windGusts: rounded(blend.windGusts, 0),
    windDirection: rounded(blend.windDirection, 0),
    condition: hour.condition,
    isNight: hour.isNight,
    models: Object.fromEntries(
      Object.entries(models).map(([modelId, model]) => [
        modelId,
        {
          temperature: rounded(model.corrected.temperature, 1),
          precipitation: rounded(model.raw.precipitation, 1),
        },
      ]),
    ),
  };
}

/**
 * Valeurs d'une grandeur sur un jour, si elles en couvrent assez (même règle que les agrégats
 * quotidiens) ; `null` sinon : on ne résume pas un jour à partir de quelques heures.
 */
function covering(values: readonly (number | null)[], dayLength: number): number[] | null {
  const present = values.filter((value): value is number => value !== null);
  return present.length > 0 && present.length >= dayLength * BLEND_CONFIG.minDayCoverage
    ? present
    : null;
}

function toDaily(
  date: string,
  /** Rang du jour : 0 pour aujourd'hui. Son échéance, en jours, vaut ce rang plus un. */
  rank: number,
  hours: readonly Hour[],
  state: CityState,
): DailyForecast | null {
  const dayLength = hoursOfParisDay(date).length;
  const [aggregate] = aggregateDaily(
    hours.map(({ blended }) => ({ time: toInstant(blended.time), ...blended.blend })),
    BLEND_CONFIG.minDayCoverage,
  );
  const bucket = bucketOf(Math.min(rank + 1, MAX_LEAD_DAYS));
  if (aggregate === undefined || bucket === null) return null;

  const modelIds = MODELS.map((model) => model.id).filter((modelId) =>
    hours.some(({ blended }) => blended.models[modelId] !== undefined),
  );
  const ofModel = (modelId: ModelId, read: (hour: Hour) => number | null | undefined) =>
    covering(
      hours.map((hour) => read(hour) ?? null),
      dayLength,
    );

  // Pluie du jour : part des modèles qui annoncent un jour de pluie, calibrée.
  const dailyAmounts = modelIds.flatMap((modelId) => {
    const amounts = ofModel(modelId, (hour) => hour.blended.models[modelId]?.raw.precipitation);
    return amounts === null ? [] : [sum(amounts)];
  });
  const agreement = rainAgreement(dailyAmounts, RAIN.dailyThreshold);
  const calibration = state.dailyRain[bucket];
  const probability =
    agreement === null || calibration === undefined
      ? null
      : rainProbability(calibration, agreement, RAIN_OPTIONS);

  const condition = dayCondition(
    {
      precipitationProbability: probability,
      hours: hours.map((hour) => ({
        condition: hour.condition,
        cloudCover: hour.blended.blend.cloudCover,
        isNight: hour.isNight,
      })),
    },
    CONDITION_SETTINGS,
  );

  // Fiabilité : écart moyen entre modèles sur le jour, et modèles proches du maximum combiné.
  const spreads = covering(
    hours.map((hour) => hour.blended.blend.temperatureSpread),
    dayLength,
  );
  const modelMaxima = modelIds.flatMap((modelId) => {
    const temperatures = ofModel(
      modelId,
      (hour) => hour.blended.models[modelId]?.corrected.temperature,
    );
    return temperatures === null ? [] : [Math.max(...temperatures)];
  });
  const table = state.reliability[bucket];
  const reliability =
    spreads === null || probability === null || table === undefined
      ? null
      : dayReliability(
          table,
          {
            spread: sum(spreads) / spreads.length,
            rainProbability: probability,
            modelValues: modelMaxima,
            combined: aggregate.max,
          },
          RELIABILITY_SETTINGS,
        );

  const weighted = hours.filter(({ blended }) => blended.blend.temperature !== null);
  const weights = Object.fromEntries(
    modelIds.flatMap((modelId) => {
      const mean =
        sum(weighted.map(({ blended }) => blended.blend.temperatureWeights[modelId] ?? 0)) /
        weighted.length;
      return weighted.length > 0 && mean > 0 ? [[modelId, roundTo(mean, 3)]] : [];
    }),
  );

  return {
    date,
    min: rounded(aggregate.min, 1),
    max: rounded(aggregate.max, 1),
    apparentMin: rounded(aggregate.apparentMin, 1),
    apparentMax: rounded(aggregate.apparentMax, 1),
    condition,
    summary: daySummary(
      {
        condition,
        windGustsMax: aggregate.windGustsMax,
        hours: hours.map((hour) => ({
          time: toInstant(hour.blended.time),
          condition: hour.condition,
          cloudCover: hour.blended.blend.cloudCover,
        })),
      },
      SUMMARY_SETTINGS,
    ),
    precipitation: rounded(aggregate.precipitation, 1),
    precipitationProbability: probability === null ? null : roundTo(probability * PERCENT, 0),
    windSpeedMax: rounded(aggregate.windSpeedMax, 0),
    windGustsMax: rounded(aggregate.windGustsMax, 0),
    humidity: rounded(aggregate.humidity, 0),
    reliability:
      reliability === null || reliability.index === null
        ? null
        : roundTo(reliability.index * PERCENT, 0),
    reliabilityLabel: reliability?.label ?? null,
    modelsAgreeing: reliability?.modelsAgreeing ?? null,
    modelsTotal: modelMaxima.length,
    weights,
  };
}

/** Nombre de jours civils de Paris publiés, aujourd'hui compris. */
export const PUBLISHED_DAYS = MAX_LEAD_DAYS;

/**
 * La prévision d'une ville, d'aujourd'hui (jour civil de Paris) aux six jours suivants. Une
 * heure qu'aucun modèle ne couvre n'est pas publiée ; un jour sans aucune heure non plus.
 */
export function buildForecastFile(
  city: ConfiguredCity,
  forecasts: CityForecasts,
  state: CityState,
): ForecastFile {
  const collectedAt = Date.parse(forecasts.collectedAt);
  const index = indexForecasts(forecasts);
  const hourly: HourlyForecast[] = [];
  const daily: DailyForecast[] = [];

  let date = parisDateKey(new Date(collectedAt));
  for (let rank = 0; rank < PUBLISHED_DAYS; rank += 1) {
    const hours = hoursOfParisDay(date).flatMap((time) => {
      const hour = blendHourAt(index, state, city, time, collectedAt);
      return hour === null ? [] : [hour];
    });
    hourly.push(...hours.map(toHourly));
    const day = hours.length === 0 ? null : toDaily(date, rank, hours, state);
    if (day !== null) daily.push(day);
    date = nextParisDay(date);
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    city: city.id,
    generatedAt: forecasts.collectedAt,
    models: MODELS.map((model) => ({
      id: model.id,
      available: forecasts.forecasts.some((forecast) => forecast.modelId === model.id),
    })),
    hourly,
    daily,
  };
}
