// Collecte des prévisions, rejouée sur les réponses réelles d'Open-Meteo enregistrées le
// 17 novembre 2026 (pipeline/__fixtures__). Les variantes abîmées en sont dérivées ici.

import assert from 'node:assert/strict';

import { CITIES } from '../../../shared/cities.ts';
import type { ConfiguredCity } from '../../../shared/cities.ts';
import { MODELS } from '../../../shared/models.ts';
import type { ConfiguredModel } from '../../../shared/models.ts';
import { collectForecasts } from '../forecasts.ts';
import type { CollectOptions } from '../options.ts';
import { buildForecastUrl } from '../openMeteoForecast.ts';
import { fakeHttp, fixtureJson, fixtureText, respond } from '../testing/fakeHttp.ts';

const [toulon, nice] = CITIES;
const [arome, arpege, ifs, icon, gfs] = MODELS;
const NOW = new Date('2026-11-17T17:00:00Z');
const NO_DATA = respond(fixtureText('open-meteo/forecast-error-no-data.json'), 400);

type Hourly = Record<string, (number | null)[] | string[]>;
type Altered = { hourly: Hourly; hourly_units: Record<string, string> } & Record<string, unknown>;

/** La réponse de Toulon, modifiée par `change` : pour simuler ce qu'Open-Meteo pourrait rendre de travers. */
function altered(change: (response: Altered) => void): string {
  const response = fixtureJson('open-meteo/forecast-toulon.json') as Altered;
  change(response);
  return JSON.stringify(response);
}

function collect(
  replies: Parameters<typeof fakeHttp>[0],
  city: ConfiguredCity = toulon,
  models: readonly ConfiguredModel[] = MODELS,
) {
  const http = fakeHttp(replies);
  const logs: string[] = [];
  const options: CollectOptions = {
    http: http.options,
    now: () => NOW,
    log: (message) => logs.push(message),
  };
  return { http, logs, result: collectForecasts(city, models, options) };
}

describe('requête de prévision', () => {
  it('demande tous les modèles en une fois, en UTC et dans les unités de Quatrauro', () => {
    const url = new URL(buildForecastUrl(toulon, MODELS));
    assert.equal(url.origin + url.pathname, 'https://api.open-meteo.com/v1/forecast');
    assert.deepEqual(Object.fromEntries(url.searchParams), {
      latitude: '43.1257',
      longitude: '5.9304',
      hourly:
        'temperature_2m,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,wind_direction_10m,cloud_cover,precipitation,weather_code',
      models:
        'meteofrance_arome_france,meteofrance_arpege_europe,ecmwf_ifs,dwd_icon_seamless,ncep_gfs_global',
      forecast_days: '8',
      timezone: 'GMT',
      temperature_unit: 'celsius',
      wind_speed_unit: 'kmh',
      precipitation_unit: 'mm',
    });
  });
});

describe('collecte des prévisions', () => {
  it.each([
    [toulon, 'open-meteo/forecast-toulon.json'],
    [nice, 'open-meteo/forecast-nice.json'],
  ] as const)('rend les séries des cinq modèles pour $name', async (city, fixture) => {
    const { http, logs, result } = collect([respond(fixtureText(fixture))], city);
    const forecasts = await result;
    const raw = fixtureJson(fixture).hourly as Hourly;

    assert.equal(forecasts.cityId, city.id);
    assert.equal(forecasts.collectedAt, '2026-11-17T17:00:00Z');
    assert.deepEqual(
      forecasts.forecasts.map((forecast) => forecast.modelId),
      ['arome', 'arpege', 'ifs', 'icon', 'gfs'],
    );
    assert.deepEqual(forecasts.unavailable, []);
    assert.deepEqual(logs, []);
    assert.equal(http.urls.length, 1);

    for (const forecast of forecasts.forecasts) {
      const model = MODELS.find((candidate) => candidate.id === forecast.modelId);
      assert.equal(forecast.times.length, 168);
      assert.equal(forecast.times[0], '2026-11-17T00:00:00Z');
      assert.equal(forecast.times.at(-1), '2026-11-23T23:00:00Z');
      assert.deepEqual(forecast.values.temperature, raw[`temperature_2m_${model?.openMeteoId}`]);
      assert.deepEqual(forecast.values.windGusts, raw[`wind_gusts_10m_${model?.openMeteoId}`]);
      assert.deepEqual(forecast.values.precipitation, raw[`precipitation_${model?.openMeteoId}`]);
      assert.deepEqual(forecast.weatherCode, raw[`weather_code_${model?.openMeteoId}`]);
    }
  });

  it('laisse vides les heures hors de portée d’un modèle', async () => {
    const forecasts = await collect([respond(fixtureText('open-meteo/forecast-toulon.json'))])
      .result;
    const aromeSeries = forecasts.forecasts.find((forecast) => forecast.modelId === 'arome');
    assert.notEqual(aromeSeries?.values.temperature[24], null);
    assert.equal(aromeSeries?.values.temperature.at(-1), null);
  });

  it('écarte un modèle absent de la réponse et continue avec les autres', async () => {
    const body = altered((response) => {
      for (const key of Object.keys(response.hourly)) {
        if (key.endsWith(`_${icon.openMeteoId}`)) delete response.hourly[key];
      }
    });
    const { logs, result } = collect([respond(body)]);
    const forecasts = await result;
    assert.deepEqual(forecasts.unavailable, ['icon']);
    assert.deepEqual(
      forecasts.forecasts.map((forecast) => forecast.modelId),
      ['arome', 'arpege', 'ifs', 'gfs'],
    );
    assert.deepEqual(logs, ['Toulon : modèle indisponible : icon']);
  });

  it('écarte un modèle en retard, qui n’a plus aucune température à venir', async () => {
    const body = altered((response) => {
      const key = `temperature_2m_${gfs.openMeteoId}`;
      const hoursPast = 17;
      response.hourly[key] = (response.hourly[key] as (number | null)[]).map((value, index) =>
        index < hoursPast ? value : null,
      );
    });
    const forecasts = await collect([respond(body)]).result;
    assert.deepEqual(forecasts.unavailable, ['gfs']);
  });

  it('laisse vide une variable manquante chez un modèle, et le signale', async () => {
    const body = altered((response) => {
      delete response.hourly[`wind_gusts_10m_${ifs.openMeteoId}`];
    });
    const { logs, result } = collect([respond(body)]);
    const forecasts = await result;
    const ifsSeries = forecasts.forecasts.find((forecast) => forecast.modelId === 'ifs');
    assert.deepEqual(forecasts.unavailable, []);
    assert.equal(ifsSeries?.values.windGusts.length, 168);
    assert.ok(ifsSeries?.values.windGusts.every((value) => value === null));
    assert.notEqual(ifsSeries?.values.temperature[20], null);
    assert.deepEqual(logs, ['Toulon : série absente, laissée vide : wind_gusts_10m (ifs)']);
  });

  it('reprend modèle par modèle quand Open-Meteo rend des séries sans nom de modèle', async () => {
    // Réponse réelle : AROME et un modèle hors domaine demandés ensemble, un seul a répondu.
    const unattributed = respond(
      fixtureText('open-meteo/forecast-toulon-model-out-of-domain.json'),
    );
    const { http, logs, result } = collect([unattributed, unattributed, NO_DATA], toulon, [
      arome,
      arpege,
    ]);
    const forecasts = await result;
    assert.deepEqual(
      forecasts.forecasts.map((forecast) => forecast.modelId),
      ['arome'],
    );
    assert.deepEqual(forecasts.unavailable, ['arpege']);
    assert.equal(forecasts.forecasts[0]?.times.length, 24);
    assert.equal(http.urls.length, 3);
    assert.match(http.urls[1] ?? '', /models=meteofrance_arome_france&/);
    assert.match(http.urls[2] ?? '', /models=meteofrance_arpege_europe&/);
    assert.deepEqual(logs, [
      'Toulon : requête groupée inexploitable, reprise modèle par modèle',
      'Toulon : ARPEGE refusé par Open-Meteo ({"error":true,"reason":"No data is available for this location"})',
      'Toulon : modèle indisponible : arpege',
    ]);
  });

  it('reprend modèle par modèle quand Open-Meteo refuse la requête groupée', async () => {
    const single = (model: ConfiguredModel) =>
      respond(
        altered((response) => {
          const suffix = `_${model.openMeteoId}`;
          const keep = Object.entries(response.hourly).filter(([key]) => key.endsWith(suffix));
          response.hourly = Object.fromEntries([
            ['time', response.hourly.time ?? []],
            ...keep.map(([key, values]) => [key.slice(0, -suffix.length), values] as const),
          ]);
          response.hourly_units = Object.fromEntries(
            Object.entries(response.hourly_units)
              .filter(([key]) => key.endsWith(suffix))
              .map(([key, unit]) => [key.slice(0, -suffix.length), unit]),
          );
        }),
      );
    const { http, result } = collect([NO_DATA, single(arome), NO_DATA, single(ifs)], toulon, [
      arome,
      arpege,
      ifs,
    ]);
    const forecasts = await result;
    assert.deepEqual(
      forecasts.forecasts.map((forecast) => forecast.modelId),
      ['arome', 'ifs'],
    );
    assert.deepEqual(forecasts.unavailable, ['arpege']);
    assert.equal(http.urls.length, 4);
  });
});

describe('collecte qui échoue', () => {
  const failure = async (replies: Parameters<typeof fakeHttp>[0], expected: RegExp) => {
    await assert.rejects(collect(replies).result, expected);
  };
  const down = respond('Bad Gateway', 502);

  it('remonte une panne d’Open-Meteo après ses tentatives', async () => {
    const { http, result } = collect([down, down, down]);
    await assert.rejects(result, /api\.open-meteo\.com a répondu 502/);
    assert.deepEqual(http.sleeps, [5_000, 20_000]);
  });

  it('refuse une réponse qui n’est pas du JSON', () =>
    failure([respond('<html>maintenance</html>')], /illisible pour Toulon/));

  it('refuse une réponse sans bloc horaire', () =>
    failure([respond(JSON.stringify({ utc_offset_seconds: 0 }))], /mal formée[\s\S]*hourly/));

  it('refuse des heures qui ne sont pas en UTC', () =>
    failure(
      [respond(altered((response) => void (response.utc_offset_seconds = 3600)))],
      /mal formée[\s\S]*utc_offset_seconds/,
    ));

  it('refuse une unité inattendue plutôt que de convertir à l’aveugle', () =>
    failure(
      [
        respond(
          altered((response) => {
            response.hourly_units[`wind_speed_10m_${arome.openMeteoId}`] = 'mp/h';
          }),
        ),
      ],
      /Unité inattendue pour « wind_speed_10m_meteofrance_arome_france » : mp\/h au lieu de km\/h/,
    ));

  it('refuse une série plus courte que les heures', () =>
    failure(
      [
        respond(
          altered((response) => {
            response.hourly[`temperature_2m_${ifs.openMeteoId}`]?.pop();
          }),
        ),
      ],
      /Série « temperature_2m_ecmwf_ifs » de longueur inattendue : 168 heures attendues/,
    ));

  it('refuse une valeur qui n’est pas un nombre', () =>
    failure(
      [
        respond(
          altered((response) => {
            (response.hourly[`temperature_2m_${ifs.openMeteoId}`] as unknown[])[3] = '12.5';
          }),
        ),
      ],
      /mal formée/,
    ));

  it('refuse des heures non consécutives', () =>
    failure(
      [
        respond(
          altered((response) => {
            (response.hourly.time as string[])[5] = '2026-11-17T09:00';
          }),
        ),
      ],
      /Heures d'Open-Meteo non consécutives/,
    ));

  it('échoue quand aucun modèle n’a de prévision', async () => {
    const { result } = collect([NO_DATA, NO_DATA, NO_DATA], toulon, [arome, arpege]);
    await assert.rejects(result, /Aucun modèle n'a de prévision pour Toulon/);
  });
});
