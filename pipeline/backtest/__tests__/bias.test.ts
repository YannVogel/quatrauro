import assert from 'node:assert/strict';

import { correctForecast, updateBias, updateError } from '../logic/bias.ts';
import { EMPTY_DECAYED_MEAN, readDecayedMean } from '../../../shared/blend/decayedMean.ts';

const HALF_LIFE_DAYS = 14;
const MIN_SAMPLES = 10;

/** Température « vraie » d'une heure : un cycle quotidien autour de 15 °C. */
const truth = (hour: number): number => 15 + 5 * Math.sin((2 * Math.PI * hour) / 24);

describe('correction de biais', () => {
  it('ramène à zéro un modèle biaisé de +2 °C', () => {
    let state = EMPTY_DECAYED_MEAN;
    for (let hour = 0; hour < 24 * 20; hour += 1) {
      state = updateBias(state, truth(hour) + 2, truth(hour), hour, HALF_LIFE_DAYS);
    }
    const hour = 24 * 20;
    const corrected = correctForecast(truth(hour) + 2, state, MIN_SAMPLES);
    assert.ok(Math.abs(corrected - truth(hour)) < 1e-9);
  });

  it('suit un biais qui change', () => {
    let state = EMPTY_DECAYED_MEAN;
    for (let hour = 0; hour < 24 * 30; hour += 1)
      state = updateBias(state, 12, 10, hour, HALF_LIFE_DAYS);
    for (let hour = 24 * 30; hour < 24 * 120; hour += 1)
      state = updateBias(state, 9, 10, hour, HALF_LIFE_DAYS);
    const bias = readDecayedMean(state, MIN_SAMPLES) ?? Number.NaN;
    assert.ok(Math.abs(bias - -1) < 0.05, `biais suivi : ${bias}`);
  });

  it('ne corrige pas un modèle sans historique suffisant', () => {
    let state = EMPTY_DECAYED_MEAN;
    for (let hour = 0; hour < MIN_SAMPLES - 1; hour += 1)
      state = updateBias(state, 12, 10, hour, HALF_LIFE_DAYS);
    assert.equal(correctForecast(20, state, MIN_SAMPLES), 20);
  });

  it('ignore une paire dont la prévision ou l’observation manque', () => {
    const state = updateBias(EMPTY_DECAYED_MEAN, 12, 10, 0, HALF_LIFE_DAYS);
    assert.equal(updateBias(state, 12, Number.NaN, 1, HALF_LIFE_DAYS), state);
    assert.equal(updateBias(state, Number.NaN, 10, 1, HALF_LIFE_DAYS), state);
    assert.equal(updateError(state, Number.NaN, 10, 1, HALF_LIFE_DAYS), state);
  });

  it("suit l'erreur absolue, quel que soit son signe", () => {
    let state = EMPTY_DECAYED_MEAN;
    for (let hour = 0; hour < 50; hour += 1) {
      state = updateError(state, hour % 2 === 0 ? 11 : 9, 10, hour, HALF_LIFE_DAYS);
    }
    assert.ok(Math.abs((readDecayedMean(state, MIN_SAMPLES) ?? Number.NaN) - 1) < 1e-12);
  });
});
