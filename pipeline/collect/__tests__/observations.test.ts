// Collecte des observations, rejouée sur des extraits réels des fichiers horaires de
// Météo-France et de la fiche data.gouv.fr (pipeline/__fixtures__). Les variantes abîmées
// en sont dérivées ici.

import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';

import { CITIES } from '../../../shared/cities.ts';
import { collectObservations, createStationReader } from '../observations.ts';
import type { CollectOptions } from '../options.ts';
import { fakeHttp, fixtureText, respond } from '../testing/fakeHttp.ts';

const [toulon, nice] = CITIES;
const DATASET = fixtureText('data-gouv/dataset-hourly-excerpt.json');
const TOULON_CSV = fixtureText('meteo-france/hourly-toulon-83137001.csv');
const NICE_CSV = fixtureText('meteo-france/hourly-nice-06088001.csv');
/** Les extraits couvrent ces deux jours, heure par heure. */
const WINDOW = { from: new Date('2026-11-15T00:00:00Z'), to: new Date('2026-11-16T23:00:00Z') };

const gzipped = (csv: string) => respond(new Uint8Array(gzipSync(csv)));

function collect(
  replies: Parameters<typeof fakeHttp>[0],
  city: (typeof CITIES)[number] = toulon,
  window = WINDOW,
) {
  const http = fakeHttp(replies);
  const logs: string[] = [];
  const options: CollectOptions = {
    http: http.options,
    now: () => new Date('2026-11-17T07:00:00Z'),
    log: (message) => logs.push(message),
  };
  return { http, logs, result: collectObservations(city, window, options) };
}

/** L'extrait de Toulon, dont une cellule de la ligne d'une heure est remplacée. */
function withCell(time: string, field: string, value: string): string {
  const [header = '', ...rows] = TOULON_CSV.split('\n');
  const columns = header.split(';');
  const at = columns.indexOf(field);
  const timeAt = columns.indexOf('AAAAMMJJHH');
  assert.ok(at >= 0 && timeAt >= 0);
  const changed = rows.map((row) => {
    const cells = row.split(';');
    if (cells[timeAt] !== time) return row;
    cells[at] = value;
    return cells.join(';');
  });
  assert.notDeepEqual(changed, rows);
  return [header, ...changed].join('\n');
}
const withoutHours = (...times: string[]): string =>
  TOULON_CSV.split('\n')
    .filter((row) => !times.some((time) => row.includes(`;${time};`)))
    .join('\n');

describe('collecte des observations', () => {
  it('rend les mesures de la station de Toulon, converties', async () => {
    const { http, logs, result } = collect([respond(DATASET), gzipped(TOULON_CSV)]);
    const observations = await result;

    assert.equal(observations.stationId, '83137001');
    assert.equal(observations.times.length, 48);
    assert.equal(observations.times[0], '2026-11-15T00:00:00Z');
    assert.equal(observations.times.at(-1), '2026-11-16T23:00:00Z');
    // Première ligne de l'extrait : T = 14,1 °C, U = 78 %, FF = 5,4 m/s, DD = 100°, FXI = 13,5 m/s, RR1 = 0,0 mm.
    assert.equal(observations.values.temperature[0], 14.1);
    assert.equal(observations.values.humidity[0], 78);
    assert.ok(Math.abs((observations.values.windSpeed[0] ?? Number.NaN) - 19.44) < 1e-9);
    assert.ok(Math.abs((observations.values.windGusts[0] ?? Number.NaN) - 48.6) < 1e-9);
    assert.equal(observations.values.windDirection[0], 100);
    assert.equal(observations.values.precipitation[0], 0);
    assert.ok(observations.values.temperature.every((value) => value !== null));
    assert.deepEqual(logs, []);
    assert.deepEqual(http.urls, [
      'https://www.data.gouv.fr/api/1/datasets/donnees-climatologiques-de-base-horaires/',
      'https://meteofrance.s3.sbg.io.cloud.ovh.net/data/synchro_ftp/BASE/HOR/H_83_latest-2025-2026.csv.gz',
    ]);
  });

  it('laisse vide la nébulosité que Toulon ne mesure pas, et lit celle de Nice', async () => {
    const atToulon = await collect([respond(DATASET), gzipped(TOULON_CSV)]).result;
    const atNice = await collect([respond(DATASET), gzipped(NICE_CSV)], nice).result;
    assert.ok(atToulon.values.cloudCover.every((value) => value === null));
    assert.equal(atNice.stationId, '06088001');
    const cloudCovers = atNice.values.cloudCover.filter((value) => value !== null);
    assert.ok(cloudCovers.length > 40);
    assert.ok(cloudCovers.every((value) => value >= 0 && value <= 100 && value % 12.5 === 0));
  });

  it('laisse manquante une heure manquante, sans interpoler', async () => {
    const csv = withoutHours('2026111503', '2026111504');
    const observations = await collect([respond(DATASET), gzipped(csv)]).result;
    assert.equal(observations.times.length, 48);
    for (const values of Object.values(observations.values)) {
      assert.equal(values[3], null);
      assert.equal(values[4], null);
    }
    assert.notEqual(observations.values.temperature[2], null);
    assert.notEqual(observations.values.temperature[5], null);
  });

  it('laisse vides les heures que le fichier ne contient pas encore', async () => {
    const window = { from: new Date('2026-11-16T22:10:00Z'), to: new Date('2026-11-17T02:50:00Z') };
    const observations = await collect([respond(DATASET), gzipped(TOULON_CSV)], toulon, window)
      .result;
    assert.deepEqual(observations.times, [
      '2026-11-16T22:00:00Z',
      '2026-11-16T23:00:00Z',
      '2026-11-17T00:00:00Z',
      '2026-11-17T01:00:00Z',
      '2026-11-17T02:00:00Z',
    ]);
    assert.deepEqual(
      observations.values.temperature.map((value) => value !== null),
      [true, true, false, false, false],
    );
  });

  it('rejette une valeur aberrante et la journalise, sans toucher aux autres mesures', async () => {
    const csv = withCell('2026111506', 'T', '99.9');
    const { logs, result } = collect([respond(DATASET), gzipped(csv)]);
    const observations = await result;
    assert.equal(observations.values.temperature[6], null);
    assert.notEqual(observations.values.humidity[6], null);
    assert.notEqual(observations.values.temperature[5], null);
    assert.deepEqual(logs, [
      'Toulon : mesure hors bornes rejetée : T = 99.9 (99.9 °C) le 2026-11-15T06:00:00Z',
    ]);
  });

  it('applique les bornes après conversion', async () => {
    // 60 m/s font 216 km/h : au-delà de la borne du vent moyen (200 km/h).
    const csv = withCell('2026111506', 'FF', '60.0');
    const { logs, result } = collect([respond(DATASET), gzipped(csv)]);
    assert.equal((await result).values.windSpeed[6], null);
    assert.deepEqual(logs, [
      'Toulon : mesure hors bornes rejetée : FF = 60.0 (216 km/h) le 2026-11-15T06:00:00Z',
    ]);
  });

  it('écarte une mesure au code qualité douteux', async () => {
    const csv = withCell('2026111506', 'QT', '2');
    const observations = await collect([respond(DATASET), gzipped(csv)]).result;
    assert.equal(observations.values.temperature[6], null);
  });

  it('ne donne pas de direction par vent nul', async () => {
    // Dans les fichiers réels, la direction vaut 0 quand le vent est nul ; le nord s'écrit 360.
    const calm = withCell('2026111506', 'FF', '0.0');
    const observations = await collect([respond(DATASET), gzipped(calm)]).result;
    assert.equal(observations.values.windSpeed[6], 0);
    assert.equal(observations.values.windDirection[6], null);
    assert.notEqual(observations.values.windDirection[5], null);
  });
});

describe('collecte des observations qui échoue', () => {
  const failure = async (replies: Parameters<typeof fakeHttp>[0], expected: RegExp) => {
    await assert.rejects(collect(replies).result, expected);
  };

  it('remonte une fiche inaccessible', () =>
    failure([respond('Not Found', 404)], /www\.data\.gouv\.fr a répondu 404/));

  it('remonte un fichier inaccessible après ses tentatives', async () => {
    const down = respond('Service Unavailable', 503);
    const { http, result } = collect([respond(DATASET), down, down, down]);
    await assert.rejects(result, /meteofrance\.s3\.sbg\.io\.cloud\.ovh\.net a répondu 503/);
    assert.deepEqual(http.sleeps, [5_000, 20_000]);
  });

  it('refuse une fiche qui n’est pas du JSON', () =>
    failure([respond('<html></html>')], /Fiche data\.gouv\.fr illisible/));

  it('refuse une fiche sans le fichier du département', () =>
    failure(
      [respond(JSON.stringify({ resources: [] }))],
      /introuvable ou ambigu pour le département 83/,
    ));

  it('refuse de télécharger le fichier depuis un serveur inconnu', async () => {
    const dataset = JSON.stringify({
      resources: [{ url: 'https://exemple.test/BASE/HOR/H_83_latest-2025-2026.csv.gz' }],
    });
    const { http, result } = collect([respond(dataset)]);
    await assert.rejects(result, /Adresse inattendue pour le fichier horaire/);
    assert.equal(http.urls.length, 1);
  });

  it('refuse un fichier qui n’est pas compressé', () =>
    failure([respond(DATASET), respond(TOULON_CSV)], /Fichier horaire de TOULON illisible/));

  it('refuse un fichier sans les colonnes attendues', () =>
    failure(
      [respond(DATASET), gzipped('NUM_POSTE;AAAAMMJJHH;T;QT\n83137001;2026111500;14.1;1\n')],
      /Colonne « U » absente du fichier horaire/,
    ));

  it('refuse une mesure illisible', () =>
    failure(
      [respond(DATASET), gzipped(withCell('2026111506', 'T', 'doux'))],
      /Mesure illisible pour T : « doux »/,
    ));

  it('refuse une heure illisible', () =>
    failure(
      [respond(DATASET), gzipped(TOULON_CSV.replace(';2026111506;', ';2026113006x;'))],
      /Heure Météo-France invalide/,
    ));

  it('échoue quand la station n’est pas dans le fichier', () =>
    failure(
      [respond(DATASET), gzipped(NICE_CSV)],
      /Station 83137001 \(TOULON\) absente du fichier horaire/,
    ));
});

describe('lecture d’une station', () => {
  it('ignore les lignes des autres stations', () => {
    const reader = createStationReader('83137001', () => undefined);
    TOULON_CSV.split('\n').forEach(reader.readLine);
    NICE_CSV.split('\n').slice(1).forEach(reader.readLine);
    assert.equal(reader.result().rows, 48);
    assert.equal(reader.result().hours.size, 48);
  });

  it('refuse une date qui n’existe pas', () => {
    const reader = createStationReader('83137001', () => undefined);
    const [header = '', first = ''] = TOULON_CSV.split('\n');
    reader.readLine(header);
    assert.throws(
      () => reader.readLine(first.replace(';2026111500;', ';2026113100;')),
      /Heure Météo-France invalide : « 2026113100 »/,
    );
  });
});
