// Fichier de prévision, sur le scénario fictif de pipeline/testing/scenario.ts.

import assert from 'node:assert/strict';

import { CITIES } from '../../../shared/cities.ts';
import { forecastFileSchema } from '../../../shared/schemas.ts';
import { replayHistory } from '../../bootstrap/replay.ts';
import { DAY_MS, HOUR_MS } from '../../instant.ts';
import { emptyCityState } from '../../state/cityState.ts';
import { forecastsAt, historyOf } from '../../testing/scenario.ts';
import { buildForecastFile } from '../forecast.ts';

const [toulon] = CITIES;
const START = Date.parse('2026-01-01T00:00:00Z');
const DAYS = 60;
const AT = START + DAYS * DAY_MS + 6 * HOUR_MS;
const learned = replayHistory(toulon.id, historyOf(START, DAYS, { noisy: true }), AT).state;

describe('fichier de prévision', () => {
  const forecast = buildForecastFile(toulon, forecastsAt(toulon.id, AT, { noisy: true }), learned);

  it('respecte le contrat', () => {
    assert.deepEqual(forecastFileSchema.parse(forecast), forecast);
    assert.equal(forecast.generatedAt, '2026-03-02T06:00:00Z');
  });

  it('distingue le jour de la nuit d’après le soleil', () => {
    const at = (time: string) => forecast.hourly.find((hour) => hour.time === time);
    assert.equal(at('2026-03-02T12:00:00Z')?.isNight, false);
    assert.equal(at('2026-03-02T23:00:00Z')?.isNight, true);
    assert.equal(at('2026-03-03T04:00:00Z')?.isNight, true);
  });

  it('exprime les probabilités en pourcentage et les annonce comme la condition', () => {
    for (const hour of forecast.hourly) {
      const probability = hour.precipitationProbability;
      assert.ok(probability !== null && probability >= 0 && probability <= 100);
      const wet = ['rain', 'showers', 'thunderstorm', 'snow'].includes(hour.condition ?? '');
      assert.equal(wet, probability >= 20, hour.time);
    }
  });

  it('résume un jour de pluie par ses heures de Paris', () => {
    // Dans le scénario, il pleut de 10 h à 16 h UTC un jour sur quatre : de 11 h à 16 h à Paris, en hiver.
    const rainy = forecast.daily.find(
      (day) => day.condition === 'rain' || day.condition === 'showers',
    );
    assert.equal(rainy?.summary, 'Pluie entre 11 h et 16 h');
    assert.equal(rainy?.precipitation, 12);
    const dry = forecast.daily.find((day) => day.condition === 'clear');
    assert.equal(dry?.summary, null);
    assert.equal(dry?.precipitation, 0);
  });

  it('donne à chaque jour l’indice de sa tranche d’échéance, en pourcentage', () => {
    for (const day of forecast.daily) {
      assert.ok(day.reliability !== null && day.reliability >= 0 && day.reliability <= 100);
      assert.ok(day.modelsAgreeing !== null && day.modelsAgreeing <= day.modelsTotal);
    }
  });
});

describe('modèle seul', () => {
  it('plafonne l’indice de fiabilité et le dit « Incertain »', () => {
    const alone = forecastsAt(toulon.id, AT, {
      noisy: true,
      withoutModels: ['arome', 'arpege', 'icon', 'gfs'],
    });
    const forecast = buildForecastFile(toulon, alone, learned);
    assert.deepEqual(
      forecast.models.filter((model) => model.available).map((model) => model.id),
      ['ifs'],
    );
    for (const day of forecast.daily) {
      assert.equal(day.modelsTotal, 1);
      assert.deepEqual(day.weights, { ifs: 1 });
      assert.ok(day.reliability !== null && day.reliability <= 50);
      assert.equal(day.reliabilityLabel, 'uncertain');
    }
  });
});

describe('sans historique', () => {
  it('publie la prévision sans indice de fiabilité, plutôt que d’en inventer un', () => {
    const forecast = buildForecastFile(
      toulon,
      forecastsAt(toulon.id, AT),
      emptyCityState(toulon.id),
    );
    assert.equal(forecast.daily.length, 7);
    for (const day of forecast.daily) {
      assert.equal(day.reliability, null);
      assert.equal(day.reliabilityLabel, null);
      assert.notEqual(day.max, null);
    }
  });
});

describe('aucun modèle', () => {
  it('ne publie ni heure ni jour', () => {
    const none = { ...forecastsAt(toulon.id, AT), forecasts: [] };
    const forecast = buildForecastFile(toulon, none, emptyCityState(toulon.id));
    assert.deepEqual(forecast.hourly, []);
    assert.deepEqual(forecast.daily, []);
    assert.ok(forecast.models.every((model) => !model.available));
  });
});
