// Archive et vérification sur un dossier temporaire, avec le scénario fictif de
// pipeline/testing/scenario.ts (modèles à biais constant autour d'un temps inventé).

import assert from 'node:assert/strict';

import { CITIES } from '../../../shared/cities.ts';
import type { ModelId } from '../../../shared/models.ts';
import { readCells } from '../../archive/forecasts.ts';
import { readDays } from '../../archive/days.ts';
import { readObservations } from '../../archive/observations.ts';
import { DAY_MS, HOUR_MS } from '../../instant.ts';
import { loadCityState, modelStateOf } from '../../state/cityState.ts';
import type { CityState } from '../../state/cityState.ts';
import { directoryStorage } from '../../storage.ts';
import type { Storage } from '../../storage.ts';
import {
  MODEL_BIAS,
  forecastsAt,
  observationsAt,
  snapshot,
  temporaryDirectory,
} from '../../testing/scenario.ts';
import type { ScenarioOptions } from '../../testing/scenario.ts';
import { archiveAndVerify, verificationFromArchive } from '../step.ts';

const [toulon] = CITIES;
const START = Date.parse('2026-03-01T05:00:00Z');
const PASS_EVERY_MS = 6 * HOUR_MS;
const DAYS = 10;
const silent = (): void => undefined;

// Dix jours de passages sur disque : chaque scénario prend quelques secondes.
jest.setTimeout(120_000);

type ObservationOptions = Parameters<typeof observationsAt>[1];

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

const pass = (
  at: number,
  options: {
    readonly forecasts?: ScenarioOptions;
    readonly observations?: ObservationOptions;
  } = {},
) =>
  archiveAndVerify(
    storage,
    toulon,
    {
      forecasts: forecastsAt(toulon.id, at, options.forecasts),
      observations: observationsAt(at, options.observations),
    },
    silent,
  );

/** Un passage toutes les six heures pendant `days` jours ; rend le dernier. */
async function run(
  days: number,
  optionsAt: (at: number) => Parameters<typeof pass>[1] = () => ({}),
) {
  let last = await pass(START, optionsAt(START));
  for (let at = START + PASS_EVERY_MS; at < START + days * DAY_MS; at += PASS_EVERY_MS) {
    last = await pass(at, optionsAt(at));
  }
  return last;
}

const meanOf = (state: CityState, modelId: ModelId, bucket: number, utcHour: number) => {
  const { bias } = modelStateOf(state, { variable: 'temperature', modelId, bucket, utcHour });
  return { count: bias.count, value: bias.weight === 0 ? null : bias.weightedSum / bias.weight };
};
const utc = (iso: string): number => Date.parse(iso);

describe('premier passage', () => {
  it('archive les prévisions et les mesures, sans rien apprendre encore', async () => {
    const { state, verification } = await pass(START);
    const files = Object.keys(await snapshot(root)).sort();

    assert.deepEqual(files, [
      'archive/forecasts/toulon/2026-03-01.json',
      'archive/observations/toulon/2026-02.json',
      'state/toulon.json',
    ]);
    assert.equal(state.lastCollectedAt, '2026-03-01T05:00:00Z');
    assert.equal(state.learnedThrough, null);
    assert.equal(verification.period, null);
    assert.deepEqual(verification.temperature.byLead, []);
    assert.deepEqual(verification.rain, { count: 0, hitRate: null });
  });

  it('range une case par heure et par échéance : les 24 heures qui finissent N jours plus tard', async () => {
    await pass(START);
    const cells = await readCells(storage, toulon.id, START, START + 9 * DAY_MS);
    for (let lead = 1; lead <= 7; lead += 1) {
      assert.equal(cells.at(START + lead * DAY_MS, lead)?.lead, lead);
      assert.notEqual(cells.at(START + lead * DAY_MS - 23 * HOUR_MS, lead), undefined);
      assert.equal(cells.at(START + lead * DAY_MS - 24 * HOUR_MS, lead), undefined);
      assert.equal(cells.at(START + lead * DAY_MS + HOUR_MS, lead), undefined);
    }
    // AROME (48 h de portée dans le scénario) n'a pas de case à trois jours.
    assert.notEqual(cells.at(START + DAY_MS, 1)?.models.arome, undefined);
    assert.equal(cells.at(START + 3 * DAY_MS, 3)?.models.arome, undefined);
    assert.notEqual(cells.at(START + 3 * DAY_MS, 3)?.models.ifs, undefined);
  });

  it('n’ajoute au passage suivant que les heures nouvelles', async () => {
    await pass(START);
    await pass(START + PASS_EVERY_MS);
    const cells = await readCells(storage, toulon.id, START, START + 9 * DAY_MS);
    assert.notEqual(cells.at(START + DAY_MS + 6 * HOUR_MS, 1), undefined);
    assert.equal(cells.at(START + DAY_MS + 7 * HOUR_MS, 1), undefined);
  });
});

describe('passage répété', () => {
  it('ne change ni l’état ni l’archive', async () => {
    await run(4);
    const at = START + 4 * DAY_MS;
    const first = await pass(at);
    const before = await snapshot(root);
    const second = await pass(at);
    assert.deepEqual(await snapshot(root), before);
    assert.deepEqual(second, first);
  });

  it('retrouve le même résultat quand le passage précédent s’est arrêté avant d’écrire l’état', async () => {
    await run(4);
    const at = START + 4 * DAY_MS;
    const stateBefore = await storage.read('state/toulon.json');
    await pass(at);
    const complete = await snapshot(root);
    // Le passage a écrit ses archives mais pas son état : on le relance.
    await storage.write('state/toulon.json', stateBefore ?? '');
    await pass(at);
    assert.deepEqual(await snapshot(root), complete);
  });
});

// Dix jours de passages, du 1er mars à 5 h au 10 mars à 23 h UTC : les heures sont apprises
// jusqu'au 9 mars à 17 h. À J+1, l'heure de 12 h UTC est donc vue neuf fois, du 1er au 9 mars.
describe('dix jours de passages', () => {
  // Ces tests ne font que lire : le scénario est joué une fois, dans son propre dossier.
  let last: Awaited<ReturnType<typeof run>>;
  let shared: Awaited<ReturnType<typeof temporaryDirectory>>;
  beforeAll(async () => {
    shared = await temporaryDirectory();
    storage = directoryStorage(shared.root);
    last = await run(DAYS);
  });
  beforeEach(() => {
    storage = directoryStorage(shared.root);
  });
  afterAll(() => shared.cleanup());

  it('apprend chaque heure une fois, quand sa mesure a eu le temps d’arriver', () => {
    assert.equal(last.state.lastCollectedAt, '2026-03-10T23:00:00Z');
    assert.equal(last.state.learnedThrough, '2026-03-09T17:00:00Z');
    assert.equal(last.state.learnedDayThrough, '2026-03-08');
    assert.equal(meanOf(last.state, 'arome', 0, 12).count, 9);
    assert.equal(meanOf(last.state, 'arome', 0, 20).count, 8);
  });

  it('retrouve le biais de chaque modèle, à chaque échéance qu’il couvre', () => {
    for (const [modelId, bias] of Object.entries(MODEL_BIAS) as [ModelId, number][]) {
      const learned = meanOf(last.state, modelId, 0, 12);
      assert.ok(Math.abs((learned.value ?? Number.NaN) - bias) < 0.11, `${modelId} à J+1`);
    }
    assert.ok(Math.abs((meanOf(last.state, 'gfs', 4, 3).value ?? Number.NaN) + 2) < 0.11);
    // AROME ne couvre pas J+3 : rien n'a été appris pour lui à cette échéance.
    assert.equal(meanOf(last.state, 'arome', 2, 12).count, 0);
  });

  it('recalcule les mêmes scores à partir de l’archive seule', async () => {
    const state = await loadCityState(storage, toulon.id);
    assert.ok(state !== null);
    const recomputed = await verificationFromArchive(
      storage,
      toulon,
      state,
      last.verification.generatedAt,
    );
    assert.deepEqual(recomputed, last.verification);
  });

  it('donne l’erreur du mélange et de chaque modèle, et le meilleur modèle seul', () => {
    const { verification } = last;
    assert.deepEqual(verification.period, { from: '2026-02-07', to: '2026-03-09' });
    assert.deepEqual(
      verification.temperature.byLead.map((score) => score.leadDays),
      [1, 2, 3, 4, 5, 6, 7],
    );
    const [dayAhead] = verification.temperature.byLead;
    assert.ok(dayAhead !== undefined);
    // Du 1er mars à 6 h au 9 mars à 17 h UTC.
    assert.equal(dayAhead.count, 8 * 24 + 12);
    // L'erreur de chaque modèle brut est son biais, à l'arrondi des valeurs près.
    for (const [modelId, bias] of Object.entries(MODEL_BIAS) as [ModelId, number][]) {
      assert.ok(Math.abs((dayAhead.models[modelId] ?? Number.NaN) - Math.abs(bias)) < 0.06);
    }
    assert.equal(dayAhead.bestModel?.id, 'ifs');
    // AROME et ARPEGE ne couvrent pas J+7.
    const week = verification.temperature.byLead.at(-1);
    assert.deepEqual(Object.keys(week?.models ?? {}).sort(), ['gfs', 'icon', 'ifs']);
  });

  it('compare le prévu de la veille à l’observé, sur les sept derniers jours jugés', () => {
    const days = last.verification.temperature.recentDays;
    assert.deepEqual(
      days.map((day) => day.date),
      [
        '2026-03-02',
        '2026-03-03',
        '2026-03-04',
        '2026-03-05',
        '2026-03-06',
        '2026-03-07',
        '2026-03-08',
      ],
    );
    for (const day of days) {
      assert.notEqual(day.observedMin, null);
      assert.notEqual(day.forecastMax, null);
    }
  });

  it('compte les jours où l’annonce de pluie était juste', () => {
    assert.deepEqual(last.verification.rain, { count: 7, hitRate: 100 });
  });
});

describe('données incomplètes', () => {
  it('n’apparie jamais une prévision à une mesure manquante', async () => {
    const missingDay = (time: number): boolean =>
      time >= utc('2026-03-06T00:00:00Z') && time < utc('2026-03-07T00:00:00Z');
    const { state } = await run(DAYS, () => ({ observations: { missing: missingDay } }));
    assert.equal(meanOf(state, 'arome', 0, 12).count, 8);

    const days = await readDays(storage, toulon.id, '2026-03-05', '2026-03-07');
    const sixth = days.find((day) => day.date === '2026-03-06' && day.lead === 1);
    assert.equal(sixth?.observedMin, null);
    assert.equal(sixth?.observedMax, null);
    assert.equal(sixth?.held, null);
    assert.notEqual(sixth?.forecastMax, null);
  });

  it('n’apprend pas d’une mesure arrivée trop tard, mais la garde dans l’archive', async () => {
    const late = utc('2026-03-06T12:00:00Z');
    // La mesure de 12 h n'est publiée que trois jours après, bien après le délai d'apprentissage.
    const { state } = await run(DAYS, (at) => ({
      observations: { missing: (time) => time === late && at < late + 3 * DAY_MS },
    }));
    assert.equal(meanOf(state, 'arome', 0, 12).count, 8);
    const archived = await readObservations(storage, toulon.id, late, late);
    assert.notEqual(archived.get(late)?.temperature ?? null, null);
  });

  it('continue sans un modèle absent plusieurs jours, et le reprend à son retour', async () => {
    const absent = (at: number): boolean =>
      at >= utc('2026-03-04T00:00:00Z') && at < utc('2026-03-06T00:00:00Z');
    const { state, verification } = await run(DAYS, (at) => ({
      forecasts: absent(at) ? { withoutModels: ['icon'] } : {},
    }));
    // Deux jours de collectes sans ICON : à J+1, l'heure de 12 h UTC lui manque les 5 et 6 mars.
    assert.equal(meanOf(state, 'icon', 0, 12).count, 7);
    assert.equal(meanOf(state, 'ifs', 0, 12).count, 9);
    assert.ok(Math.abs((meanOf(state, 'icon', 0, 12).value ?? Number.NaN) - 1.5) < 0.11);
    const dayAhead = verification.temperature.byLead.find((score) => score.leadDays === 1);
    assert.notEqual(dayAhead?.models.icon, undefined);
  });
});
