import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { CITIES } from '../../../shared/cities.ts';
import { MODELS } from '../../../shared/models.ts';
import { VARIABLES } from '../config.ts';
import {
  createHourAxis,
  dateAt,
  hourOfMeteoFranceTime,
  hourOfOpenMeteoTime,
  utcHourAt,
} from '../data/hours.ts';
import { findLatestHourlyFileUrl } from '../../meteoFranceHourly.ts';
import { createHourlyParser } from '../data/meteoFrance.ts';
import { buildPreviousRunsUrl, parsePreviousRuns } from '../data/openMeteo.ts';

const fixtures = path.join(__dirname, '..', '..', '__fixtures__');
const read = (file: string): string => readFileSync(path.join(fixtures, file), 'utf8');

const find = <T extends { readonly id: string }>(items: readonly T[], id: string): T => {
  const item = items.find((entry) => entry.id === id);
  if (item === undefined) throw new Error(`Introuvable : ${id}`);
  return item;
};

const toulon = find(CITIES, 'toulon');
const nice = find(CITIES, 'nice');
const temperature = find(VARIABLES, 'temperature');
const axis = createHourAxis('2026-11-15', '2026-11-16');

describe('axe horaire', () => {
  it('couvre les jours demandés, bornes comprises', () => {
    assert.equal(axis.length, 48);
    assert.equal(dateAt(axis, 0), '2026-11-15');
    assert.equal(dateAt(axis, 47), '2026-11-16');
    assert.equal(utcHourAt(axis, 25), 1);
  });

  it('lit les heures d’Open-Meteo et de Météo-France comme des heures UTC', () => {
    assert.equal(hourOfOpenMeteoTime('2026-11-15T03:00') - axis.startHour, 3);
    assert.equal(hourOfMeteoFranceTime('2026111503') - axis.startHour, 3);
    assert.throws(() => hourOfMeteoFranceTime('20261115'));
    assert.throws(() => hourOfOpenMeteoTime('pas une heure'));
    assert.throws(() => createHourAxis('2026-11-16', '2026-11-14'));
  });
});

describe('réponse Previous Runs', () => {
  const response: unknown = JSON.parse(read('open-meteo/previous-runs-toulon.json'));

  it('demande les décalages couverts par le modèle', () => {
    const url = new URL(
      buildPreviousRunsUrl(toulon, find(MODELS, 'arpege'), temperature, {
        start: '2026-11-15',
        end: '2026-11-16',
      }),
    );
    assert.equal(
      url.searchParams.get('hourly'),
      'temperature_2m_previous_day1,temperature_2m_previous_day2,temperature_2m_previous_day3',
    );
    assert.equal(url.searchParams.get('models'), 'meteofrance_arpege_europe');
    assert.equal(url.searchParams.get('timezone'), 'GMT');
  });

  it('aligne les séries d’une réponse réelle sur l’axe', () => {
    const ifs = { ...find(MODELS, 'ifs'), historyLeadDays: 3 };
    const series = parsePreviousRuns(response, ifs, temperature, axis);
    assert.equal(series.length, 3);
    assert.ok(
      series.every(
        (values) => values.length === 48 && values.every((value) => Number.isFinite(value)),
      ),
    );
  });

  it('garde absente une valeur absente', () => {
    // AROME ne couvre pas J−2 : la série existe dans la réponse, entièrement vide.
    const arome = { ...find(MODELS, 'arome'), historyLeadDays: 2 };
    const [dayOne, dayTwo] = parsePreviousRuns(response, arome, temperature, axis);
    assert.ok(dayOne?.every((value) => Number.isFinite(value)));
    assert.ok(dayTwo?.every((value) => Number.isNaN(value)));
  });

  it('refuse une réponse qui n’a pas la forme attendue', () => {
    const ifs = find(MODELS, 'ifs');
    assert.throws(() =>
      parsePreviousRuns({ error: true, reason: 'No data' }, ifs, temperature, axis),
    );
    assert.throws(() =>
      parsePreviousRuns({ hourly: { time: ['2026-11-15T00:00'] } }, ifs, temperature, axis),
    );
    assert.throws(() =>
      parsePreviousRuns(
        { hourly: { time: ['2026-11-15T00:00'], temperature_2m_previous_day1: ['chaud'] } },
        { ...ifs, historyLeadDays: 1 },
        temperature,
        axis,
      ),
    );
  });
});

describe('fichier horaire de Météo-France', () => {
  const parse = (file: string, station: string) => {
    const parser = createHourlyParser(station, VARIABLES, axis);
    read(file)
      .split('\n')
      .filter((line) => line !== '')
      .forEach(parser.readLine);
    return parser.result();
  };

  it('lit les mesures de la station et les convertit', () => {
    const observations = parse('meteo-france/hourly-toulon-83137001.csv', toulon.station.id);
    // Première ligne de l'extrait : T = 14,1 °C, FF = 5,4 m/s, FXI = 13,5 m/s, RR1 = 0,0 mm.
    assert.equal(observations.temperature[0], 14.1);
    assert.ok(Math.abs((observations.windSpeed[0] ?? Number.NaN) - 19.44) < 1e-9);
    assert.ok(Math.abs((observations.windGusts[0] ?? Number.NaN) - 48.6) < 1e-9);
    assert.equal(observations.precipitation[0], 0);
    assert.ok(observations.temperature.every((value) => Number.isFinite(value)));
  });

  it('laisse absente une variable que la station ne mesure pas', () => {
    const observations = parse('meteo-france/hourly-toulon-83137001.csv', toulon.station.id);
    assert.ok(observations.cloudCover.every((value) => Number.isNaN(value)));
  });

  it('convertit la nébulosité en pourcentage', () => {
    const observations = parse('meteo-france/hourly-nice-06088001.csv', nice.station.id);
    const measured = [...observations.cloudCover].filter((value) => Number.isFinite(value));
    assert.ok(measured.length > 0);
    assert.ok(measured.every((value) => value >= 0 && value <= 100 && value % 12.5 === 0));
  });

  it('ignore les autres stations et les mesures douteuses', () => {
    assert.ok(
      parse('meteo-france/hourly-nice-06088001.csv', toulon.station.id).temperature.every((value) =>
        Number.isNaN(value),
      ),
    );
    const parser = createHourlyParser(
      '1',
      VARIABLES.filter((variable) => variable.id === 'temperature'),
      axis,
    );
    [
      'NUM_POSTE;AAAAMMJJHH;T;QT',
      '1;2026111500;12.5;1',
      '1;2026111501;40.0;2',
      '1;2026111502;;',
    ].forEach(parser.readLine);
    const { temperature: values } = parser.result();
    assert.equal(values[0], 12.5);
    assert.ok(Number.isNaN(values[1]));
    assert.ok(Number.isNaN(values[2]));
  });

  it('refuse un fichier sans les colonnes attendues ou une mesure illisible', () => {
    assert.throws(() => createHourlyParser('1', VARIABLES, axis).readLine('NUM_POSTE;AAAAMMJJHH'));
    const parser = createHourlyParser(
      '1',
      VARIABLES.filter((variable) => variable.id === 'temperature'),
      axis,
    );
    parser.readLine('NUM_POSTE;AAAAMMJJHH;T;QT');
    assert.throws(() => parser.readLine('1;2026111500;doux;1'));
  });

  it('retrouve le fichier des deux dernières années dans la fiche du jeu de données', () => {
    const dataset = {
      resources: [
        { url: 'https://exemple.test/BASE/HOR/H_83_previous-2020-2024.csv.gz' },
        { url: 'https://exemple.test/BASE/HOR/H_83_latest-2025-2026.csv.gz' },
        { url: 'https://exemple.test/BASE/HOR/H_06_latest-2025-2026.csv.gz' },
      ],
    };
    assert.equal(
      findLatestHourlyFileUrl(dataset, '83'),
      'https://exemple.test/BASE/HOR/H_83_latest-2025-2026.csv.gz',
    );
    assert.throws(() => findLatestHourlyFileUrl(dataset, '13'));
    assert.throws(() => findLatestHourlyFileUrl({}, '83'));
  });
});
