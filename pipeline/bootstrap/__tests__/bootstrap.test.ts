// Amorçage sur un historique réduit : le scénario fictif de pipeline/testing/scenario.ts
// (modèles à biais constant et, ici, à erreur propre, autour d'un temps inventé).

import assert from 'node:assert/strict';

import { reliabilityIndex } from '../../../shared/blend/reliability.ts';
import { BLEND_CONFIG } from '../../../shared/blendConfig.ts';
import { CITIES } from '../../../shared/cities.ts';
import type { ModelId } from '../../../shared/models.ts';
import { readDays } from '../../archive/days.ts';
import { blendModels } from '../../blend/hour.ts';
import { DAY_MS, HOUR_MS, toInstant } from '../../instant.ts';
import {
  emptyCityState,
  loadCityState,
  modelStateOf,
  saveCityState,
} from '../../state/cityState.ts';
import type { CityState } from '../../state/cityState.ts';
import { directoryStorage } from '../../storage.ts';
import type { Storage } from '../../storage.ts';
import {
  MODEL_BIAS,
  forecastsAt,
  historyOf,
  observationsAt,
  snapshot,
  temporaryDirectory,
} from '../../testing/scenario.ts';
import { archiveAndVerify, verificationFromArchive } from '../../verify/step.ts';
import { replayHistory } from '../replay.ts';
import { bootstrapCity, refuseExistingStates } from '../write.ts';

const [toulon, nice] = CITIES;
const START = Date.parse('2026-01-01T00:00:00Z');
const DAYS = 60;
const history = historyOf(START, DAYS, { noisy: true });

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

const biasOf = (state: CityState, modelId: ModelId, bucket: number, utcHour: number) => {
  const { bias } = modelStateOf(state, { variable: 'temperature', modelId, bucket, utcHour });
  return { count: bias.count, value: bias.weight === 0 ? null : bias.weightedSum / bias.weight };
};

describe('rejeu de l’historique', () => {
  const { state, cells, days } = replayHistory(toulon.id, history, history.lastHour - 10 * DAY_MS);

  it('apprend jusqu’à 30 heures avant la fin, et pas plus loin', () => {
    assert.equal(state.learnedThrough, '2026-02-28T17:00:00Z');
    assert.equal(state.lastCollectedAt, '2026-03-01T23:00:00Z');
    assert.equal(state.learnedDayThrough, '2026-02-27');
  });

  it('retrouve le biais de chaque modèle', () => {
    for (const [modelId, bias] of Object.entries(MODEL_BIAS) as [ModelId, number][]) {
      const learned = biasOf(state, modelId, 0, 12);
      assert.ok(learned.count >= 50);
      assert.ok(Math.abs((learned.value ?? Number.NaN) - bias) < 0.3, modelId);
    }
  });

  it('donne ensuite des poids différenciés : le modèle le plus régulier pèse le plus', () => {
    const time = history.lastHour;
    const blended = blendModels(history.modelsAt(time, 1), state, time, 1);
    const weights = blended?.blend.temperatureWeights ?? {};
    assert.ok(Math.abs(Object.values(weights).reduce((sum, weight) => sum + weight, 0) - 1) < 1e-9);
    // Dans le scénario, AROME a la plus petite erreur propre et GFS la plus grande.
    assert.ok((weights.arome ?? 0) > (weights.ifs ?? 0));
    assert.ok((weights.ifs ?? 0) > (weights.arpege ?? 0));
    assert.equal(weights.gfs, BLEND_CONFIG.corrected.weights.minWeight);
  });

  it('donne un indice de fiabilité à chaque tranche d’échéance', () => {
    for (const table of state.reliability) {
      assert.ok(table.overall.total >= BLEND_CONFIG.reliability.minSamples);
      const index = reliabilityIndex(
        table,
        { spread: 0.5, rainProbability: 0.05, modelCount: 3 },
        BLEND_CONFIG.reliability,
      );
      assert.ok(index !== null && index >= 0 && index <= 1);
    }
  });

  it('juge chaque jour à chaque échéance, et ne rend que les cases récentes', () => {
    const dayAhead = days.filter((day) => day.lead === 1);
    assert.equal(dayAhead.at(-1)?.date, '2026-02-27');
    assert.ok(dayAhead.length >= 56);
    assert.ok(cells.length > 0);
    assert.ok(cells.every((cell) => cell.time >= history.lastHour - 10 * DAY_MS));
  });

  it('n’utilise jamais une mesure postérieure à ce qu’il apprend', () => {
    // Sans les mesures des deux derniers jours, rien ne change : elles n'avaient pas été lues.
    const withoutLastDays = {
      ...history,
      observations: new Map(
        [...history.observations].filter(([time]) => time <= history.lastHour - 30 * HOUR_MS),
      ),
    };
    const shortened = replayHistory(toulon.id, withoutLastDays, history.lastHour - 10 * DAY_MS);
    assert.deepEqual(shortened.state, state);
  });
});

describe('amorçage d’une ville', () => {
  it('écrit l’état, l’archive des derniers jours et le registre de tous les jours', async () => {
    const state = await bootstrapCity(storage, toulon, history);
    const files = Object.keys(await snapshot(root)).sort();

    assert.deepEqual(await loadCityState(storage, toulon.id), state);
    assert.ok(files.includes('state/toulon.json'));
    assert.deepEqual(
      files.filter((file) => file.startsWith('archive/days/')),
      ['archive/days/toulon/2026-01.json', 'archive/days/toulon/2026-02.json'],
    );
    // Les cases gardées couvrent la période des scores (30 jours), plus une marge et sept jours d'échéance.
    const forecastFiles = files.filter((file) => file.startsWith('archive/forecasts/toulon/'));
    assert.equal(forecastFiles[0], 'archive/forecasts/toulon/2026-01-20.json');
    assert.equal(forecastFiles.at(-1), 'archive/forecasts/toulon/2026-02-28.json');
    const allDays = await readDays(storage, toulon.id, '2026-01-01', '2026-03-01');
    assert.ok(allDays.filter((day) => day.lead === 1).length >= 56);
  });

  it('permet de publier des scores dès le premier passage', async () => {
    const state = await bootstrapCity(storage, toulon, history);
    const verification = await verificationFromArchive(
      storage,
      toulon,
      state,
      '2026-03-02T06:00:00Z',
    );
    assert.deepEqual(verification.period, { from: '2026-01-29', to: '2026-02-28' });
    assert.deepEqual(
      verification.temperature.byLead.map((score) => score.leadDays),
      [1, 2, 3, 4, 5, 6, 7],
    );
    assert.equal(verification.temperature.byLead[0]?.count, 30 * 24);
    assert.equal(verification.temperature.recentDays.length, 7);
    assert.equal(verification.rain.count, 30);
  });

  it('refuse d’écraser un état existant', async () => {
    await refuseExistingStates(storage, [toulon, nice]);
    await saveCityState(storage, await bootstrapCity(storage, nice, history));
    await assert.rejects(
      refuseExistingStates(storage, [toulon, nice]),
      /Nice a déjà un état \(state\/nice\.json\)[\s\S]*--force/,
    );
    await refuseExistingStates(storage, [toulon]);
  });
});

describe('amorçage et passages réels', () => {
  /** Tous les nombres d'un état, dans l'ordre : pour comparer deux états à l'arrondi près. */
  const numbersOf = (state: CityState): number[] => {
    const numbers: number[] = [];
    const walk = (value: unknown): void => {
      if (typeof value === 'number') numbers.push(value);
      else if (Array.isArray(value)) value.forEach(walk);
      else if (typeof value === 'object' && value !== null) {
        Object.keys(value)
          .sort()
          .forEach((key) => walk((value as Record<string, unknown>)[key]));
      }
    };
    walk(state);
    return numbers;
  };

  it('aboutissent au même état quand le pipeline passe toutes les heures', async () => {
    const days = 5;
    const replayed = replayHistory(toulon.id, historyOf(START, days, { noisy: true }), START);

    // Un premier passage archive d'un coup les 24 heures qui précèdent chaque échéance ; le
    // rejeu, lui, n'a rien avant sa première heure. On part donc d'un pipeline déjà passé une
    // heure plus tôt, pour que les deux voient exactement les mêmes cases.
    await saveCityState(storage, {
      ...emptyCityState(toulon.id),
      lastCollectedAt: toInstant(START - HOUR_MS),
    });
    let live: CityState | null = null;
    for (let at = START; at < START + days * DAY_MS; at += HOUR_MS) {
      const result = await archiveAndVerify(
        storage,
        toulon,
        {
          forecasts: forecastsAt(toulon.id, at, { noisy: true }),
          observations: observationsAt(at, { lookbackDays: 3 }),
        },
        () => undefined,
      );
      live = result.state;
    }
    assert.ok(live !== null);
    assert.equal(live.learnedThrough, replayed.state.learnedThrough);
    assert.equal(live.learnedDayThrough, replayed.state.learnedDayThrough);
    assert.equal(live.lastCollectedAt, replayed.state.lastCollectedAt);

    const expected = numbersOf(replayed.state);
    const actual = numbersOf(live);
    assert.equal(actual.length, expected.length);
    // L'état d'un passage est arrondi à chaque écriture, celui du rejeu une seule fois.
    actual.forEach((value, index) => {
      assert.ok(Math.abs(value - (expected[index] ?? Number.NaN)) < 1e-4, `nombre ${index}`);
    });
  });
});
