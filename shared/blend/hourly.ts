// Mélange d'une heure : à partir de ce que chaque modèle prévoit pour cette heure et de ce
// qu'on sait de lui, la valeur combinée de chaque variable (ADR 0003).
//
// - température, humidité, vent moyen, rafales : correction de biais et moyenne pondérée ;
// - direction du vent : moyenne vectorielle, avec les poids du vent moyen ;
// - nébulosité : moyenne simple ;
// - pluie : cumul par moyenne simple, probabilité par accord entre modèles, calibrée ;
// - température ressentie : dérivée des champs mélangés.

import type { ModelId } from '../models.ts';
import type { ModelState } from '../series.ts';
import { CORRECTED_VARIABLES } from '../variables.ts';
import type { CorrectedVariable, ForecastVariable } from '../variables.ts';
import { apparentTemperature } from './apparentTemperature.ts';
import { blendCorrected } from './corrected.ts';
import type { CorrectedBlend, CorrectedParams } from './corrected.ts';
import { rainAgreement, rainProbability } from './rain.ts';
import type { RainCalibration, RainOptions } from './rain.ts';
import { meanDirection } from './wind.ts';

/** Ce qu'un modèle prévoit pour l'heure, et son état pour cette tranche d'échéance et cette heure de la journée. */
export type ModelHour = {
  readonly modelId: ModelId;
  readonly values: Readonly<Record<ForecastVariable, number | null>>;
  readonly states: Readonly<Record<CorrectedVariable, ModelState>>;
};

export type HourParams = {
  readonly corrected: CorrectedParams;
  readonly rain: RainOptions & {
    /** Cumul à partir duquel il pleut dans l'heure, en mm. */
    readonly hourlyThreshold: number;
  };
};

export type HourBlend = {
  readonly temperature: number | null;
  /** Écart-type entre les températures corrigées des modèles. */
  readonly temperatureSpread: number | null;
  readonly apparentTemperature: number | null;
  readonly humidity: number | null;
  readonly windSpeed: number | null;
  readonly windGusts: number | null;
  readonly windDirection: number | null;
  readonly cloudCover: number | null;
  readonly precipitation: number | null;
  /** Probabilité de pluie dans l'heure, de 0 à 1. */
  readonly precipitationProbability: number | null;
  /** Modèles qui donnent une température à cette heure : un seul, et l'heure repose sur lui. */
  readonly temperatureModels: readonly ModelId[];
  /** Poids de chaque modèle dans la température. */
  readonly temperatureWeights: Readonly<Partial<Record<ModelId, number>>>;
  /** Température corrigée et cumul de pluie de chaque modèle disponible. */
  readonly models: Readonly<
    Partial<Record<ModelId, { temperature: number | null; precipitation: number | null }>>
  >;
};

const PERCENT = { min: 0, max: 100 } as const;
const POSITIVE = { min: 0, max: Number.POSITIVE_INFINITY } as const;

/** Bornes physiques : la correction de biais peut pousser une valeur hors de son domaine. */
const BOUNDS: Readonly<
  Record<CorrectedVariable, { readonly min: number; readonly max: number } | null>
> = {
  temperature: null,
  humidity: PERCENT,
  windSpeed: POSITIVE,
  windGusts: POSITIVE,
};

type Available = { readonly modelId: ModelId; readonly value: number };

function available(models: readonly ModelHour[], variable: ForecastVariable): Available[] {
  return models.flatMap((model) => {
    const value = model.values[variable];
    return value === null || !Number.isFinite(value) ? [] : [{ modelId: model.modelId, value }];
  });
}

const mean = (values: readonly number[]): number | null =>
  values.length === 0 ? null : values.reduce((total, value) => total + value, 0) / values.length;

function clamp(value: number, variable: CorrectedVariable): number {
  const bounds = BOUNDS[variable];
  return bounds === null ? value : Math.min(Math.max(value, bounds.min), bounds.max);
}

function blendVariable(
  models: readonly ModelHour[],
  variable: CorrectedVariable,
  params: CorrectedParams,
): { readonly blend: CorrectedBlend; readonly modelIds: readonly ModelId[] } | null {
  const present = models.filter((model) => {
    const value = model.values[variable];
    return value !== null && Number.isFinite(value);
  });
  const blend = blendCorrected(
    present.map((model) => ({
      forecast: model.values[variable] ?? Number.NaN,
      bias: model.states[variable].bias,
      error: model.states[variable].error,
    })),
    params,
  );
  return blend === null ? null : { blend, modelIds: present.map((model) => model.modelId) };
}

/**
 * Valeurs combinées d'une heure. Une variable qu'aucun modèle ne fournit vaut `null`.
 * `calibration` est celle de la tranche d'échéance de l'heure.
 */
export function blendHour(
  models: readonly ModelHour[],
  calibration: RainCalibration,
  params: HourParams,
): HourBlend {
  const blends = Object.fromEntries(
    CORRECTED_VARIABLES.map((variable) => [
      variable,
      blendVariable(models, variable, params.corrected),
    ]),
  ) as Record<CorrectedVariable, ReturnType<typeof blendVariable>>;
  const valueOf = (variable: CorrectedVariable): number | null => {
    const result = blends[variable];
    return result === null ? null : clamp(result.blend.value, variable);
  };

  const temperature = blends.temperature;
  const temperatureWeights: Partial<Record<ModelId, number>> = {};
  const correctedTemperatures: Partial<Record<ModelId, number>> = {};
  temperature?.modelIds.forEach((modelId, index) => {
    temperatureWeights[modelId] = temperature.blend.weights[index] ?? 0;
    correctedTemperatures[modelId] = temperature.blend.corrected[index] ?? Number.NaN;
  });

  // La direction suit les poids du vent moyen ; un modèle qui ne donne que la direction pèse comme les autres.
  const windSpeed = blends.windSpeed;
  const directions = available(models, 'windDirection');
  const directionWeights = directions.map((direction) => {
    const index = windSpeed?.modelIds.indexOf(direction.modelId) ?? -1;
    return index === -1 ? 1 / directions.length : (windSpeed?.blend.weights[index] ?? 0);
  });

  const rainAmounts = available(models, 'precipitation').map((entry) => entry.value);
  const agreement = rainAgreement(rainAmounts, params.rain.hourlyThreshold);

  const humidity = valueOf('humidity');
  const windSpeedValue = valueOf('windSpeed');
  const temperatureValue = valueOf('temperature');

  return {
    temperature: temperatureValue,
    temperatureSpread: temperature?.blend.spread ?? null,
    apparentTemperature: apparentTemperature(temperatureValue, humidity, windSpeedValue),
    humidity,
    windSpeed: windSpeedValue,
    windGusts: valueOf('windGusts'),
    windDirection: meanDirection(
      directions.map((direction) => direction.value),
      directionWeights,
    ),
    cloudCover: mean(available(models, 'cloudCover').map((entry) => entry.value)),
    precipitation: mean(rainAmounts),
    precipitationProbability:
      agreement === null ? null : rainProbability(calibration, agreement, params.rain),
    temperatureModels: temperature?.modelIds ?? [],
    temperatureWeights,
    models: Object.fromEntries(
      models
        .filter((model) => model.values.temperature !== null || model.values.precipitation !== null)
        .map((model) => [
          model.modelId,
          {
            temperature: correctedTemperatures[model.modelId] ?? null,
            precipitation: model.values.precipitation,
          },
        ]),
    ),
  };
}
