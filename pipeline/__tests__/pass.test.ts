// Passage complet du pipeline, de bout en bout, sur un dossier temporaire. Deux jeux de données :
// les réponses réelles enregistrées (pipeline/__fixtures__) pour le passage nominal, et le
// scénario fictif de pipeline/testing/scenario.ts quand il faut un historique.

import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';

import { CITIES } from '../../shared/cities.ts';
import { MODELS } from '../../shared/models.ts';
import { forecastFileSchema, verificationFileSchema } from '../../shared/schemas.ts';
import type { ForecastFile } from '../../shared/schemas.ts';
import { bootstrapCity } from '../bootstrap/write.ts';
import { fakeHttp, fixtureJson, fixtureText, respond } from '../collect/testing/fakeHttp.ts';
import { DAY_MS } from '../instant.ts';
import { main } from '../main.ts';
import type { Environment } from '../main.ts';
import { runPass } from '../pass.ts';
import type { Collectors } from '../pass.ts';
import { publishCity } from '../publish/publish.ts';
import { directoryStorage } from '../storage.ts';
import type { Storage } from '../storage.ts';
import {
  forecastsAt,
  historyOf,
  observationsAt,
  snapshot,
  temporaryDirectory,
} from '../testing/scenario.ts';

const [toulon, nice] = CITIES;
/** Les réponses enregistrées datent du 17 novembre 2026, vers 17 h UTC. */
const NOW = new Date('2026-11-17T17:00:00Z');
const DATASET = fixtureText('data-gouv/dataset-hourly-excerpt.json');
const gzipped = (file: string) => respond(new Uint8Array(gzipSync(fixtureText(file))));

jest.setTimeout(120_000);

let root = '';
let storage: Storage;
let cleanup: () => Promise<void> = () => Promise.resolve();

beforeEach(async () => {
  const directory = await temporaryDirectory();
  root = directory.root;
  cleanup = directory.cleanup;
  storage = directoryStorage(root);
});
afterEach(() => cleanup());

/** Ce que le réseau répond à un passage : pour chaque ville, la prévision, la fiche, le fichier horaire. */
const recordedReplies = (toulonForecast = fixtureText('open-meteo/forecast-toulon.json')) => [
  respond(toulonForecast),
  respond(DATASET),
  gzipped('meteo-france/hourly-toulon-83137001.csv'),
  respond(fixtureText('open-meteo/forecast-nice.json')),
  respond(DATASET),
  gzipped('meteo-france/hourly-nice-06088001.csv'),
];

function command(replies: Parameters<typeof fakeHttp>[0], ...flags: string[]) {
  const http = fakeHttp(replies);
  const logs: string[] = [];
  const environment: Environment = {
    fetch: http.options.fetch,
    sleep: http.options.sleep,
    now: () => NOW,
    log: (message) => logs.push(message),
  };
  return { http, logs, exitCode: main([`--data-dir=${root}`, ...flags], environment) };
}

const readForecast = async (city: string): Promise<ForecastFile> =>
  forecastFileSchema.parse(JSON.parse((await storage.read(`forecast/${city}.json`)) ?? ''));

describe('passage nominal, sur les réponses enregistrées', () => {
  it('écrit des fichiers valides pour les deux villes', async () => {
    const { exitCode, logs, http } = command(recordedReplies());
    assert.equal(await exitCode, 0);
    assert.equal(http.urls.length, 6);

    const files = Object.keys(await snapshot(root)).sort();
    assert.deepEqual(files, [
      'archive/forecasts/nice/2026-11-17.json',
      'archive/forecasts/toulon/2026-11-17.json',
      'archive/observations/nice/2026-11.json',
      'archive/observations/toulon/2026-11.json',
      'forecast/nice.json',
      'forecast/toulon.json',
      'state/nice.json',
      'state/toulon.json',
      'verification/nice.json',
      'verification/toulon.json',
    ]);
    for (const city of [toulon, nice]) {
      const forecast = await readForecast(city.id);
      const verification = verificationFileSchema.parse(
        JSON.parse((await storage.read(`verification/${city.id}.json`)) ?? ''),
      );
      assert.equal(forecast.city, city.id);
      assert.equal(forecast.generatedAt, '2026-11-17T17:00:00Z');
      assert.equal(verification.period, null);
    }
    assert.ok(
      logs.some((line) => line === 'Toulon : modèles utilisés : arome, arpege, ifs, icon, gfs'),
    );
    assert.ok(logs.some((line) => /^Passage terminé en \d+ s$/.test(line)));
  });

  it('publie les sept jours civils de Paris, d’aujourd’hui à J+6, autant que la réponse en couvre', async () => {
    await command(recordedReplies()).exitCode;
    const forecast = await readForecast('toulon');
    // La réponse enregistrée commence le 17 à 0 h UTC (1 h à Paris) et couvre sept jours UTC.
    assert.equal(forecast.hourly[0]?.time, '2026-11-17T00:00:00Z');
    assert.equal(forecast.hourly.at(-1)?.time, '2026-11-23T22:00:00Z');
    assert.equal(forecast.hourly.length, 7 * 24 - 1);
    assert.deepEqual(
      forecast.daily.map((day) => day.date),
      [
        '2026-11-17',
        '2026-11-18',
        '2026-11-19',
        '2026-11-20',
        '2026-11-21',
        '2026-11-22',
        '2026-11-23',
      ],
    );
    assert.deepEqual(
      forecast.models,
      MODELS.map((model) => ({ id: model.id, available: true })),
    );
  });

  it('sans historique, pèse les modèles à égalité et n’annonce aucun indice de fiabilité', async () => {
    await command(recordedReplies()).exitCode;
    const forecast = await readForecast('toulon');
    const raw = fixtureJson('open-meteo/forecast-toulon.json').hourly as Record<string, number[]>;
    const at = 20;
    const hour = forecast.hourly[at];
    const temperatures = MODELS.map(
      (model) => raw[`temperature_2m_${model.openMeteoId}`]?.[at] ?? Number.NaN,
    );
    const mean = temperatures.reduce((sum, value) => sum + value, 0) / temperatures.length;

    assert.equal(hour?.time, '2026-11-17T20:00:00Z');
    assert.ok(Math.abs((hour?.temperature ?? Number.NaN) - mean) <= 0.051);
    assert.equal(
      hour?.models.arome?.temperature,
      raw['temperature_2m_meteofrance_arome_france']?.[at],
    );
    const [today] = forecast.daily;
    assert.deepEqual(today?.weights, { arome: 0.2, arpege: 0.2, ifs: 0.2, icon: 0.2, gfs: 0.2 });
    assert.equal(today?.modelsTotal, 5);
    for (const day of forecast.daily) {
      assert.equal(day.reliability, null);
      assert.equal(day.reliabilityLabel, null);
    }
  });

  it('ne compte que les modèles qui couvrent le jour', async () => {
    await command(recordedReplies()).exitCode;
    const forecast = await readForecast('nice');
    const totals = forecast.daily.map((day) => day.modelsTotal);
    // AROME s'arrête au bout de 51 h, ARPEGE au bout de 102 h.
    assert.equal(totals[0], 5);
    assert.equal(totals.at(-1), 3);
    assert.deepEqual(Object.keys(forecast.daily.at(-1)?.weights ?? {}).sort(), [
      'gfs',
      'icon',
      'ifs',
    ]);
  });

  it('donne à chaque jour une condition cohérente avec son annonce de pluie', async () => {
    await command(recordedReplies()).exitCode;
    for (const city of ['toulon', 'nice']) {
      for (const day of (await readForecast(city)).daily) {
        const wet = ['rain', 'showers', 'thunderstorm', 'snow'].includes(day.condition ?? '');
        assert.notEqual(day.condition, null);
        assert.equal(wet, (day.precipitationProbability ?? 0) >= 30, `${city} ${day.date}`);
      }
    }
  });

  it('ne change aucun fichier quand on le relance au même instant', async () => {
    await command(recordedReplies()).exitCode;
    const before = await snapshot(root);
    assert.equal(await command(recordedReplies()).exitCode, 0);
    assert.deepEqual(await snapshot(root), before);
  });
});

describe('modèle absent', () => {
  it('le signale dans le fichier publié et continue avec les autres', async () => {
    const response = fixtureJson('open-meteo/forecast-toulon.json') as {
      hourly: Record<string, unknown>;
    };
    for (const key of Object.keys(response.hourly)) {
      if (key.endsWith('_dwd_icon_seamless')) delete response.hourly[key];
    }
    const { exitCode, logs } = command(recordedReplies(JSON.stringify(response)));
    assert.equal(await exitCode, 0);

    const forecast = await readForecast('toulon');
    assert.deepEqual(
      forecast.models.find((model) => model.id === 'icon'),
      {
        id: 'icon',
        available: false,
      },
    );
    assert.equal(forecast.daily[0]?.modelsTotal, 4);
    assert.equal(forecast.hourly[20]?.models.icon, undefined);
    assert.ok(
      logs.includes('Toulon : modèles utilisés : arome, arpege, ifs, gfs ; absents : icon'),
    );
    // Nice, elle, a ses cinq modèles.
    assert.ok((await readForecast('nice')).models.every((model) => model.available));
  });
});

describe('panne de la collecte', () => {
  const down = respond('Bad Gateway', 502);

  it('laisse les fichiers précédents intacts et rend un code d’erreur', async () => {
    await command(recordedReplies()).exitCode;
    const before = await snapshot(root);

    const { exitCode, logs } = command([down, down, down]);
    assert.equal(await exitCode, 1);
    assert.deepEqual(await snapshot(root), before);
    assert.match(
      logs.at(-1) ?? '',
      /^Passage en échec, rien n'a été écrit : api\.open-meteo\.com a répondu 502/,
    );
  });

  it('n’écrit rien non plus pour la ville déjà traitée quand la suivante échoue', async () => {
    const replies = [...recordedReplies().slice(0, 3), down, down, down];
    const { exitCode } = command(replies);
    assert.equal(await exitCode, 1);
    assert.deepEqual(await snapshot(root), {});
  });

  it('rend un code d’erreur pour un argument inconnu, sans rien lancer', async () => {
    const { exitCode, http, logs } = command([], '--dry-rum');
    assert.equal(await exitCode, 1);
    assert.equal(http.urls.length, 0);
    assert.match(logs.at(-1) ?? '', /Argument inconnu : --dry-rum/);
  });
});

describe('passage à blanc', () => {
  it('calcule tout et n’écrit rien', async () => {
    const { exitCode, logs } = command(recordedReplies(), '--dry-run');
    assert.equal(await exitCode, 0);
    assert.deepEqual(await snapshot(root), {});
    assert.ok(logs.includes('Passage à blanc : 10 fichiers calculés, aucun écrit'));
  });
});

describe('fichier invalide', () => {
  it('est refusé avant toute écriture', async () => {
    await command(recordedReplies()).exitCode;
    const forecast = await readForecast('toulon');
    const verification = verificationFileSchema.parse(
      JSON.parse((await storage.read('verification/toulon.json')) ?? ''),
    );
    const [today, ...rest] = forecast.daily;
    assert.ok(today !== undefined);
    const invalid = { ...forecast, daily: [{ ...today, reliability: 140 }, ...rest] };
    const before = await snapshot(root);

    await assert.rejects(
      publishCity(storage, {
        forecast: invalid,
        verification: { ...verification, generatedAt: 'x' },
      }),
      /Fichier refusé, il ne respecte pas le contrat : forecast\/toulon\.json \(daily\.0\.reliability/,
    );
    await assert.rejects(
      publishCity(storage, { forecast, verification: { ...verification, generatedAt: 'hier' } }),
      /verification\/toulon\.json \(generatedAt/,
    );
    assert.deepEqual(await snapshot(root), before);
  });
});

describe('premier passage après l’amorçage (scénario fictif)', () => {
  const START = Date.parse('2026-01-01T00:00:00Z');
  const DAYS = 60;
  const at = START + DAYS * DAY_MS + 6 * 3_600_000;
  const collectors: Collectors = {
    forecasts: (city) => Promise.resolve(forecastsAt(city.id, at, { noisy: true })),
    observations: () => Promise.resolve(observationsAt(at)),
  };

  it('publie des poids différenciés et un indice de fiabilité', async () => {
    await bootstrapCity(storage, toulon, historyOf(START, DAYS, { noisy: true }));
    const { cities } = await runPass({
      storage,
      cities: [toulon],
      collectors,
      collectedAt: new Date(at),
      log: () => undefined,
      dryRun: false,
    });
    const forecast = cities[0]?.forecast;
    const verification = cities[0]?.verification;
    assert.ok(forecast !== undefined && verification !== undefined);

    const [today] = forecast.daily;
    const weights = today?.weights ?? {};
    // Dans le scénario, AROME est le plus régulier et GFS le moins.
    assert.ok((weights.arome ?? 0) > (weights.ifs ?? 0));
    assert.ok((weights.ifs ?? 0) > (weights.gfs ?? 0));
    assert.ok(Math.abs(Object.values(weights).reduce((sum, weight) => sum + weight, 0) - 1) < 0.01);
    for (const day of forecast.daily) {
      assert.notEqual(day.reliability, null, day.date);
      assert.notEqual(day.reliabilityLabel, null, day.date);
    }
    assert.notEqual(verification.period, null);
    assert.equal(verification.temperature.byLead.length, 7);
    assert.deepEqual(await readForecast('toulon'), forecast);
  });
});
