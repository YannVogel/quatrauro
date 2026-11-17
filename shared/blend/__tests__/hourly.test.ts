import { BLEND_CONFIG } from '../../blendConfig';
import type { ModelId } from '../../models';
import type { ModelState } from '../../series';
import type { ForecastVariable } from '../../variables';
import { updateBias } from '../bias';
import { blendCorrected } from '../corrected';
import { EMPTY_DECAYED_MEAN } from '../decayedMean';
import type { DecayedMean } from '../decayedMean';
import { blendHour } from '../hourly';
import type { HourParams, ModelHour } from '../hourly';
import { EMPTY_RAIN_CALIBRATION, updateRainCalibration } from '../rain';
import { updateError } from '../weights';

const params: HourParams = {
  corrected: {
    minSamples: BLEND_CONFIG.corrected.minSamples,
    weights: BLEND_CONFIG.corrected.weights,
  },
  rain: BLEND_CONFIG.rain,
};

const NEW_MODEL: ModelState = { bias: EMPTY_DECAYED_MEAN, error: EMPTY_DECAYED_MEAN };
const NO_STATE = {
  temperature: NEW_MODEL,
  humidity: NEW_MODEL,
  windSpeed: NEW_MODEL,
  windGusts: NEW_MODEL,
};
const NOTHING: Record<ForecastVariable, number | null> = {
  temperature: null,
  humidity: null,
  windSpeed: null,
  windGusts: null,
  windDirection: null,
  cloudCover: null,
  precipitation: null,
};

/** État d'un modèle qui s'est trompé de `bias` en moyenne, avec une erreur résiduelle de `error`. */
function learned(bias: number, error: number): ModelState {
  let biasState: DecayedMean = EMPTY_DECAYED_MEAN;
  let errorState: DecayedMean = EMPTY_DECAYED_MEAN;
  for (let hour = 0; hour < 40; hour += 1) {
    biasState = updateBias(biasState, 10 + bias, 10, hour, 20);
    errorState = updateError(errorState, 10 + (hour % 2 === 0 ? error : -error), 10, hour, 60);
  }
  return { bias: biasState, error: errorState };
}

function model(
  modelId: ModelId,
  values: Partial<Record<ForecastVariable, number | null>>,
  states: Partial<typeof NO_STATE> = {},
): ModelHour {
  return { modelId, values: { ...NOTHING, ...values }, states: { ...NO_STATE, ...states } };
}

describe("mélange d'une variable corrigée", () => {
  it('corrige chaque modèle de son biais avant de moyenner', () => {
    const warm = learned(2, 1);
    const cold = learned(-2, 1);
    const blend = blendCorrected(
      [
        { forecast: 17, ...warm },
        { forecast: 13, ...cold },
      ],
      params.corrected,
    );
    expect(blend?.corrected[0]).toBeCloseTo(15, 9);
    expect(blend?.corrected[1]).toBeCloseTo(15, 9);
    expect(blend?.value).toBeCloseTo(15, 9);
    expect(blend?.spread).toBeCloseTo(0, 9);
  });

  it('donne plus de poids au modèle le plus précis', () => {
    const blend = blendCorrected(
      [
        { forecast: 10, ...learned(0, 0.5) },
        { forecast: 20, ...learned(0, 1) },
      ],
      params.corrected,
    );
    expect(blend?.weights[0]).toBeGreaterThan(blend?.weights[1] ?? Number.NaN);
    expect(blend?.value).toBeLessThan(15);
  });

  it('ne rend rien sans modèle', () => {
    expect(blendCorrected([], params.corrected)).toBeNull();
  });
});

describe("mélange d'une heure", () => {
  it('combine chaque variable des modèles disponibles', () => {
    const blend = blendHour(
      [
        model('arome', {
          temperature: 16,
          humidity: 60,
          windSpeed: 20,
          windGusts: 34,
          windDirection: 350,
          cloudCover: 20,
          precipitation: 0,
        }),
        model('ifs', {
          temperature: 14,
          humidity: 70,
          windSpeed: 10,
          windGusts: 26,
          windDirection: 10,
          cloudCover: 60,
          precipitation: 0.4,
        }),
      ],
      EMPTY_RAIN_CALIBRATION,
      params,
    );
    // Deux modèles sans historique : poids égaux, pas de correction.
    expect(blend.temperature).toBeCloseTo(15, 9);
    expect(blend.temperatureSpread).toBeCloseTo(1, 9);
    expect(blend.humidity).toBeCloseTo(65, 9);
    expect(blend.windSpeed).toBeCloseTo(15, 9);
    expect(blend.windGusts).toBeCloseTo(30, 9);
    expect(blend.windDirection).toBeCloseTo(0, 9);
    expect(blend.cloudCover).toBeCloseTo(40, 9);
    expect(blend.precipitation).toBeCloseTo(0.2, 9);
    expect(blend.temperatureModels).toEqual(['arome', 'ifs']);
    expect(blend.temperatureWeights).toEqual({ arome: 0.5, ifs: 0.5 });
    expect(blend.models).toEqual({
      arome: { temperature: 16, precipitation: 0 },
      ifs: { temperature: 14, precipitation: 0.4 },
    });
  });

  it('dérive le ressenti des champs mélangés', () => {
    const blend = blendHour(
      [model('arome', { temperature: 20, humidity: 50, windSpeed: 18 })],
      EMPTY_RAIN_CALIBRATION,
      params,
    );
    expect(blend.apparentTemperature).toBeCloseTo(16.35, 1);
  });

  it('rend la valeur du seul modèle qui couvre l’heure, et le signale', () => {
    const blend = blendHour(
      [model('gfs', { temperature: 12.5, precipitation: 1.2 })],
      EMPTY_RAIN_CALIBRATION,
      params,
    );
    expect(blend.temperature).toBe(12.5);
    expect(blend.temperatureSpread).toBe(0);
    expect(blend.temperatureModels).toEqual(['gfs']);
    expect(blend.temperatureWeights).toEqual({ gfs: 1 });
  });

  it("ignore un modèle pour la variable qu'il ne fournit pas", () => {
    const blend = blendHour(
      [
        model('ifs', { temperature: 14, windSpeed: 12, windGusts: null }),
        model('icon', { temperature: 16, windSpeed: 18, windGusts: 40 }),
      ],
      EMPTY_RAIN_CALIBRATION,
      params,
    );
    expect(blend.windGusts).toBe(40);
    expect(blend.windSpeed).toBeCloseTo(15, 9);
    expect(blend.temperatureModels).toEqual(['ifs', 'icon']);
  });

  it("n'invente aucune valeur quand tous les modèles manquent", () => {
    const empty = blendHour([], EMPTY_RAIN_CALIBRATION, params);
    const silent = blendHour([model('arome', {})], EMPTY_RAIN_CALIBRATION, params);
    for (const blend of [empty, silent]) {
      expect(blend.temperature).toBeNull();
      expect(blend.temperatureSpread).toBeNull();
      expect(blend.apparentTemperature).toBeNull();
      expect(blend.humidity).toBeNull();
      expect(blend.windSpeed).toBeNull();
      expect(blend.windGusts).toBeNull();
      expect(blend.windDirection).toBeNull();
      expect(blend.cloudCover).toBeNull();
      expect(blend.precipitation).toBeNull();
      expect(blend.precipitationProbability).toBeNull();
      expect(blend.temperatureModels).toEqual([]);
      expect(blend.models).toEqual({});
    }
  });

  it('garde les valeurs corrigées dans leurs bornes physiques', () => {
    // Un modèle qui surestime l'humidité de 30 points et le vent de 15 km/h : la correction
    // ferait descendre le vent sous zéro.
    const state = {
      humidity: learned(-30, 1),
      windSpeed: learned(15, 1),
      windGusts: learned(15, 1),
    };
    const blend = blendHour(
      [model('arome', { temperature: 20, humidity: 90, windSpeed: 5, windGusts: 8 }, state)],
      EMPTY_RAIN_CALIBRATION,
      params,
    );
    expect(blend.humidity).toBe(100);
    expect(blend.windSpeed).toBe(0);
    expect(blend.windGusts).toBe(0);
  });

  it("tire la probabilité de pluie de l'accord entre modèles", () => {
    const hour = (amounts: readonly number[]) =>
      blendHour(
        amounts.map((precipitation, index) =>
          model((['arome', 'arpege', 'ifs', 'icon'] as const)[index] ?? 'gfs', { precipitation }),
        ),
        EMPTY_RAIN_CALIBRATION,
        params,
      );
    // Sans historique de calibration, la probabilité est l'accord brut.
    expect(hour([0, 0, 0, 0]).precipitationProbability).toBe(0);
    expect(hour([1, 0, 0, 0]).precipitationProbability).toBe(0.25);
    expect(hour([1, 2, 0.5, 0.2]).precipitationProbability).toBe(1);
    // Sous le seuil du pluviomètre, ce n'est pas de la pluie.
    expect(hour([0.1, 0.1]).precipitationProbability).toBe(0);
  });

  it('calibre la probabilité sur ce qui a été observé pour le même accord', () => {
    let calibration = EMPTY_RAIN_CALIBRATION;
    // Quand tous les modèles annonçaient la pluie, il a plu 6 fois sur 10.
    for (let index = 0; index < 100; index += 1) {
      calibration = updateRainCalibration(calibration, 1, index % 10 < 6);
    }
    const blend = blendHour(
      [model('arome', { precipitation: 1 }), model('ifs', { precipitation: 2 })],
      calibration,
      params,
    );
    expect(blend.precipitationProbability).toBeCloseTo(0.6, 2);
  });
});
