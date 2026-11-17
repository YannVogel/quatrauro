import assert from 'node:assert/strict';

import { updateBias } from '../../../shared/blend/bias.ts';
import { EMPTY_RAIN_CALIBRATION, updateRainCalibration } from '../../../shared/blend/rain.ts';
import { directoryStorage } from '../../storage.ts';
import { temporaryDirectory } from '../../testing/scenario.ts';
import {
  bucketOf,
  emptyCityState,
  loadCityState,
  modelStateOf,
  normalizeCityState,
  saveCityState,
  setModelState,
} from '../cityState.ts';

const slot = { variable: 'temperature', modelId: 'arome', bucket: 0, utcHour: 14 } as const;

describe('état d’une ville', () => {
  it('part de zéro : aucun modèle, aucune heure apprise', () => {
    const state = emptyCityState('toulon');
    assert.equal(state.learnedThrough, null);
    assert.equal(modelStateOf(state, slot).bias.count, 0);
    assert.equal(state.reliability.length, 5);
  });

  it('range un état de modèle par variable, modèle, tranche et heure', () => {
    const state = emptyCityState('toulon');
    const learned = { ...modelStateOf(state, slot) };
    learned.bias = updateBias(learned.bias, 16, 15, 500_000, 20);
    setModelState(state, slot, learned);
    assert.equal(modelStateOf(state, slot).bias.count, 1);
    assert.equal(modelStateOf(state, { ...slot, utcHour: 15 }).bias.count, 0);
    assert.equal(modelStateOf(state, { ...slot, bucket: 1 }).bias.count, 0);
    assert.equal(modelStateOf(state, { ...slot, modelId: 'ifs' }).bias.count, 0);
  });

  it('associe chaque échéance à sa tranche', () => {
    assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map(bucketOf), [0, 1, 2, 3, 3, 4, 4]);
    assert.equal(bucketOf(8), null);
  });

  it('se relit tel qu’il a été écrit', async () => {
    const { root, cleanup } = await temporaryDirectory();
    try {
      const storage = directoryStorage(root);
      const state = emptyCityState('nice');
      setModelState(state, slot, {
        bias: updateBias(modelStateOf(state, slot).bias, 16.123456789, 15, 500_000, 20),
        error: modelStateOf(state, slot).error,
      });
      state.hourlyRain[0] = updateRainCalibration(EMPTY_RAIN_CALIBRATION, 1, true);
      state.learnedThrough = '2026-11-15T12:00:00Z';
      state.learnedDayThrough = '2026-11-14';
      state.lastCollectedAt = '2026-11-17T06:00:00Z';

      assert.equal(await loadCityState(storage, 'nice'), null);
      await saveCityState(storage, state);
      const reloaded = await loadCityState(storage, 'nice');
      assert.deepEqual(reloaded, normalizeCityState(state));
      // Six décimales dans le fichier.
      assert.equal(
        reloaded === null ? null : modelStateOf(reloaded, slot).bias.weightedSum,
        1.123457,
      );
      assert.equal(reloaded?.hourlyRain[0]?.overall.total, 1);
    } finally {
      await cleanup();
    }
  });

  it('refuse un fichier d’état d’une autre version', async () => {
    const { root, cleanup } = await temporaryDirectory();
    try {
      const storage = directoryStorage(root);
      await saveCityState(storage, emptyCityState('toulon'));
      const content = (await storage.read('state/toulon.json')) ?? '';
      await storage.write(
        'state/toulon.json',
        content.replace('"schemaVersion":1', '"schemaVersion":2'),
      );
      await assert.rejects(
        loadCityState(storage, 'toulon'),
        /Fichier invalide : state\/toulon\.json/,
      );
    } finally {
      await cleanup();
    }
  });
});
