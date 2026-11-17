// Ce que montre le détail d'un jour, tiré de la prévision publiée : le déroulé de la journée,
// les chiffres clés, et ce sur quoi les modèles ne s'accordent pas. Fonctions pures.

import {
  DAY_CHART_STEP_HOURS,
  MAX_TEMPERATURE_DISAGREEMENT,
  RAIN_START_DISAGREEMENT_HOURS,
} from '@/lib/config';
import { BLEND_CONFIG } from '@shared/blendConfig';
import type { Condition } from '@shared/conditions';
import { MODELS } from '@shared/models';
import type { ModelId } from '@shared/models';
import { parisDateKey, parisDayLengthHours, parisHour } from '@shared/parisTime';
import type { DailyForecast, ForecastFile, HourlyForecast } from '@shared/schemas';

import { longDayOf } from './home';

export type DayColumn = {
  /** Heure de Paris, de 0 à 23. */
  readonly hour: number;
  readonly temperature: number | null;
  readonly rainProbability: number | null;
};

/** Ce qu'un modèle dit d'un jour, sur la grandeur où ils divergent. */
export type ModelOpinion = {
  readonly modelId: ModelId;
  readonly name: string;
  /** Heure de Paris du début de la pluie, ou température maximale ; `null` : pas de pluie. */
  readonly value: number | null;
};

export type Disagreement = {
  /** La grandeur sur laquelle les modèles divergent le plus. */
  readonly kind: 'rainStart' | 'maxTemperature';
  readonly opinions: readonly ModelOpinion[];
};

export type DayContent = {
  /** « Jeudi 19 novembre ». */
  readonly title: string;
  readonly max: number | null;
  readonly min: number | null;
  readonly condition: Condition | null;
  readonly summary: string | null;
  readonly reliability: number | null;
  /** Nombre de modèles qui couvrent ce jour. */
  readonly modelsTotal: number;
  readonly columns: readonly DayColumn[];
  readonly stats: {
    readonly wind: number | null;
    readonly rain: number | null;
    readonly humidity: number | null;
    readonly feelsLike: number | null;
  };
  /** `null` quand les modèles sont d'accord, ou qu'un seul couvre le jour. */
  readonly disagreement: Disagreement | null;
};

type ModelSeries = {
  readonly modelId: ModelId;
  readonly name: string;
  readonly temperatures: readonly (number | null)[];
  readonly rains: readonly (number | null)[];
};

const present = (values: readonly (number | null)[]): number[] =>
  values.filter((value): value is number => value !== null);

/** Un modèle dit quelque chose d'un jour s'il en couvre assez d'heures (règle des agrégats). */
const covers = (values: readonly (number | null)[], dayLength: number): boolean =>
  present(values).length >= dayLength * BLEND_CONFIG.minDayCoverage;

function seriesOf(hours: readonly HourlyForecast[]): ModelSeries[] {
  return MODELS.map((model) => ({
    modelId: model.id,
    name: model.name,
    temperatures: hours.map((hour) => hour.models[model.id]?.temperature ?? null),
    rains: hours.map((hour) => hour.models[model.id]?.precipitation ?? null),
  }));
}

/** Début de la pluie selon chaque modèle qui couvre le jour, si leurs avis divergent. */
function rainStartDisagreement(
  hours: readonly HourlyForecast[],
  models: readonly ModelSeries[],
  dayLength: number,
): Disagreement | null {
  const opinions = models
    .filter((model) => covers(model.rains, dayLength))
    .map((model): ModelOpinion => {
      const first = model.rains.findIndex(
        (amount) => amount !== null && amount >= BLEND_CONFIG.rain.hourlyThreshold,
      );
      const hour = hours[first];
      return {
        modelId: model.modelId,
        name: model.name,
        value: hour === undefined ? null : parisHour(new Date(hour.time)),
      };
    });
  const starts = present(opinions.map((opinion) => opinion.value));
  if (opinions.length < 2 || starts.length === 0) return null;
  const someStayDry = starts.length < opinions.length;
  const spread = Math.max(...starts) - Math.min(...starts);
  return someStayDry || spread >= RAIN_START_DISAGREEMENT_HOURS
    ? { kind: 'rainStart', opinions }
    : null;
}

/** Température maximale selon chaque modèle qui couvre le jour, si leurs avis divergent. */
function maxTemperatureDisagreement(
  models: readonly ModelSeries[],
  dayLength: number,
): Disagreement | null {
  const opinions = models
    .filter((model) => covers(model.temperatures, dayLength))
    .map((model): ModelOpinion => ({
      modelId: model.modelId,
      name: model.name,
      value: Math.max(...present(model.temperatures)),
    }));
  const maxima = present(opinions.map((opinion) => opinion.value));
  if (opinions.length < 2) return null;
  return Math.max(...maxima) - Math.min(...maxima) >= MAX_TEMPERATURE_DISAGREEMENT
    ? { kind: 'maxTemperature', opinions }
    : null;
}

function contentOf(day: DailyForecast, hours: readonly HourlyForecast[]): DayContent {
  const dayLength = parisDayLengthHours(day.date);
  const models = seriesOf(hours);
  return {
    title: longDayOf(day.date),
    max: day.max,
    min: day.min,
    condition: day.condition,
    summary: day.summary,
    reliability: day.reliability,
    modelsTotal: day.modelsTotal,
    columns: hours
      .map((hour) => ({
        hour: parisHour(new Date(hour.time)),
        temperature: hour.temperature,
        rainProbability: hour.precipitationProbability,
      }))
      .filter((column) => column.hour % DAY_CHART_STEP_HOURS === 0),
    stats: {
      wind: day.windSpeedMax,
      rain: day.precipitation,
      humidity: day.humidity,
      feelsLike: day.apparentMax,
    },
    // La pluie d'abord : c'est elle qui change les plans de la journée.
    disagreement:
      rainStartDisagreement(hours, models, dayLength) ??
      maxTemperatureDisagreement(models, dayLength),
  };
}

/**
 * Le détail d'un jour civil de Paris (`AAAA-MM-JJ`). `null` quand ce jour n'est pas dans la
 * prévision, ou qu'il est déjà passé à l'instant `now`.
 */
export function dayContent(forecast: ForecastFile, date: string, now: Date): DayContent | null {
  const day = forecast.daily.find((candidate) => candidate.date === date);
  if (day === undefined || date < parisDateKey(now)) return null;
  const hours = forecast.hourly.filter((hour) => parisDateKey(new Date(hour.time)) === date);
  return contentOf(day, hours);
}
