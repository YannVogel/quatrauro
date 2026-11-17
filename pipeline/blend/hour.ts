// Mélange d'une heure à une échéance donnée, à partir des prévisions collectées et de l'état
// de la ville. C'est le seul endroit du pipeline qui appelle le mélange de `shared/` : la
// prévision publiée et les cases de l'archive en sortent toutes les deux.

import { correctForecast } from '../../shared/blend/bias.ts';
import { blendHour } from '../../shared/blend/hourly.ts';
import type { HourBlend, HourParams, ModelHour } from '../../shared/blend/hourly.ts';
import { BLEND_CONFIG, MAX_LEAD_DAYS } from '../../shared/blendConfig.ts';
import type { ModelId } from '../../shared/models.ts';
import type { CityForecasts, ModelState } from '../../shared/series.ts';
import { CORRECTED_VARIABLES, FORECAST_VARIABLES } from '../../shared/variables.ts';
import type { CorrectedVariable, ForecastVariable } from '../../shared/variables.ts';
import type { Cell, ModelCell, Pass } from '../archive/forecasts.ts';
import { ARCHIVE_DECIMALS, roundTo } from '../config.ts';
import { DAY_MS, HOUR_MS, floorToHour } from '../instant.ts';
import { bucketOf, modelStateOf } from '../state/cityState.ts';
import type { CityState } from '../state/cityState.ts';

export const HOUR_PARAMS: HourParams = {
  corrected: {
    minSamples: BLEND_CONFIG.corrected.minSamples,
    weights: BLEND_CONFIG.corrected.weights,
  },
  rain: {
    priorStrength: BLEND_CONFIG.rain.priorStrength,
    minSamples: BLEND_CONFIG.rain.minSamples,
    hourlyThreshold: BLEND_CONFIG.rain.hourlyThreshold,
  },
};

type Values = Readonly<Record<ForecastVariable, number | null>>;

export type ForecastIndex = {
  /** Heures de validité couvertes par au moins un modèle, dans l'ordre, en millisecondes. */
  readonly times: readonly number[];
  /** Ce que prévoit chaque modèle disponible à cette heure. */
  readonly modelsAt: (time: number) => readonly { modelId: ModelId; values: Values }[];
  /** Code météo de chaque modèle à cette heure. */
  readonly weatherCodesAt: (time: number) => readonly (number | null)[];
};

export function indexForecasts(forecasts: CityForecasts): ForecastIndex {
  const positions = forecasts.forecasts.map(
    (forecast) => new Map(forecast.times.map((time, index) => [Date.parse(time), index])),
  );
  const times = [...new Set(positions.flatMap((byTime) => [...byTime.keys()]))].sort(
    (a, b) => a - b,
  );
  return {
    times,
    modelsAt: (time) =>
      forecasts.forecasts.flatMap((forecast, model) => {
        const index = positions[model]?.get(time);
        if (index === undefined) return [];
        const values = Object.fromEntries(
          FORECAST_VARIABLES.map((variable) => [
            variable,
            forecast.values[variable][index] ?? null,
          ]),
        ) as Record<ForecastVariable, number | null>;
        return Object.values(values).some((value) => value !== null)
          ? [{ modelId: forecast.modelId, values }]
          : [];
      }),
    weatherCodesAt: (time) =>
      forecasts.forecasts.map((forecast, model) => {
        const index = positions[model]?.get(time);
        return index === undefined ? null : (forecast.weatherCode[index] ?? null);
      }),
  };
}

/** Échéance, en jours, d'une heure de validité vue depuis un instant de collecte : 1 pour les 24 prochaines heures. */
export function leadOf(time: number, collectedAt: number): number {
  return Math.max(1, Math.ceil((time - floorToHour(collectedAt)) / DAY_MS));
}

export type BlendedHour = {
  readonly time: number;
  readonly lead: number;
  readonly blend: HourBlend;
  readonly models: Readonly<Partial<Record<ModelId, ModelCell>>>;
};

/**
 * Mélange d'une heure à une échéance. `null` au-delà de la dernière tranche d'échéance ou
 * quand aucun modèle ne couvre l'heure.
 */
export function blendAt(
  index: ForecastIndex,
  state: CityState,
  time: number,
  lead: number,
): BlendedHour | null {
  const bucket = bucketOf(lead);
  const available = index.modelsAt(time);
  if (bucket === null || available.length === 0) return null;
  const utcHour = new Date(time).getUTCHours();

  const hours: ModelHour[] = available.map(({ modelId, values }) => ({
    modelId,
    values,
    states: Object.fromEntries(
      CORRECTED_VARIABLES.map((variable) => [
        variable,
        modelStateOf(state, { variable, modelId, bucket, utcHour }),
      ]),
    ) as Record<CorrectedVariable, ModelState>,
  }));
  const calibration = state.hourlyRain[bucket];
  if (calibration === undefined) return null;

  const models = Object.fromEntries(
    hours.map((hour) => [
      hour.modelId,
      {
        raw: hour.values,
        corrected: Object.fromEntries(
          CORRECTED_VARIABLES.map((variable) => {
            const raw = hour.values[variable];
            const corrected =
              raw === null
                ? null
                : correctForecast(
                    raw,
                    hour.states[variable].bias,
                    HOUR_PARAMS.corrected.minSamples,
                  );
            return [variable, corrected === null ? null : roundTo(corrected, ARCHIVE_DECIMALS)];
          }),
        ) as Record<CorrectedVariable, number | null>,
      },
    ]),
  ) as Partial<Record<ModelId, ModelCell>>;

  return { time, lead, blend: blendHour(hours, calibration, HOUR_PARAMS), models };
}

const rounded = (value: number | null): number | null =>
  value === null ? null : roundTo(value, ARCHIVE_DECIMALS);

export function toCell(hour: BlendedHour): Cell {
  return {
    time: hour.time,
    lead: hour.lead,
    models: hour.models,
    blend: {
      temperature: rounded(hour.blend.temperature),
      temperatureSpread: rounded(hour.blend.temperatureSpread),
    },
  };
}

/**
 * Les cases qu'un passage ajoute à l'archive : pour chaque échéance N, les heures dont
 * l'instant « N jours plus tôt » tombe entre le passage précédent et celui-ci. Chaque case est
 * donc écrite une seule fois, par le premier passage qui suit cet instant. Si le passage
 * précédent date de plus d'un jour, les heures qu'il aurait fallu prévoir entre-temps restent
 * sans case : elles ne relèvent plus de cette échéance.
 */
export function buildPass(
  forecasts: CityForecasts,
  state: CityState,
  previousCollectedAt: string | null,
): Pass {
  const index = indexForecasts(forecasts);
  const collected = floorToHour(Date.parse(forecasts.collectedAt));
  const previous =
    previousCollectedAt === null
      ? Number.NEGATIVE_INFINITY
      : floorToHour(Date.parse(previousCollectedAt));
  const start = Math.max(previous, collected - DAY_MS);

  const cells: Cell[] = [];
  for (let lead = 1; lead <= MAX_LEAD_DAYS; lead += 1) {
    const offset = lead * DAY_MS;
    for (let time = start + HOUR_MS + offset; time <= collected + offset; time += HOUR_MS) {
      const hour = blendAt(index, state, time, lead);
      if (hour !== null) cells.push(toCell(hour));
    }
  }
  return { collectedAt: forecasts.collectedAt, cells };
}
