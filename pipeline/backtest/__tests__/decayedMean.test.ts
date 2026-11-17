import assert from 'node:assert/strict';

import { EMPTY_DECAYED_MEAN, readDecayedMean, updateDecayedMean } from '../logic/decayedMean.ts';

const HALF_LIFE_DAYS = 10;

describe('moyenne à pondération exponentielle', () => {
  it("ne rend rien tant que l'historique est trop court", () => {
    const state = updateDecayedMean(EMPTY_DECAYED_MEAN, 2, 0, HALF_LIFE_DAYS);
    assert.equal(readDecayedMean(state, 2), null);
    assert.equal(readDecayedMean(EMPTY_DECAYED_MEAN, 0), null);
  });

  it('rend la valeur commune quand toutes les valeurs sont égales', () => {
    let state = EMPTY_DECAYED_MEAN;
    for (let hour = 0; hour < 100; hour += 1)
      state = updateDecayedMean(state, 1.5, hour, HALF_LIFE_DAYS);
    assert.ok(Math.abs((readDecayedMean(state, 1) ?? Number.NaN) - 1.5) < 1e-12);
  });

  it("donne deux fois moins de poids à une valeur vieille d'une demi-vie", () => {
    const old = updateDecayedMean(EMPTY_DECAYED_MEAN, 0, 0, HALF_LIFE_DAYS);
    const state = updateDecayedMean(old, 3, HALF_LIFE_DAYS * 24, HALF_LIFE_DAYS);
    // (0 × 0,5 + 3 × 1) / (0,5 + 1) = 2
    assert.ok(Math.abs((readDecayedMean(state, 1) ?? Number.NaN) - 2) < 1e-12);
  });

  it('ignore une valeur absente', () => {
    const state = updateDecayedMean(EMPTY_DECAYED_MEAN, 4, 0, HALF_LIFE_DAYS);
    assert.equal(updateDecayedMean(state, Number.NaN, 1, HALF_LIFE_DAYS), state);
  });

  it("ne modifie pas l'état qu'on lui passe", () => {
    const state = updateDecayedMean(EMPTY_DECAYED_MEAN, 4, 0, HALF_LIFE_DAYS);
    const copy = { ...state };
    updateDecayedMean(state, 8, 5, HALF_LIFE_DAYS);
    assert.deepEqual(state, copy);
    assert.deepEqual(EMPTY_DECAYED_MEAN, { weightedSum: 0, weight: 0, count: 0, lastHour: 0 });
  });
});
