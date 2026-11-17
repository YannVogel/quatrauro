import assert from 'node:assert/strict';

import { bestModelOnPreviousWindow, simpleMean } from '../baselines.ts';
import { createHourAxis, emptySeries } from '../data/hours.ts';
import type { BlendParams } from '../params.ts';
import { commonPositions, scoreSeries } from '../score.ts';
import { simulateBlend } from '../simulate.ts';
import type { SimulationInput } from '../simulate.ts';

const axis = createHourAxis('2026-01-01', '2026-03-01');
const DELAY = 30;
const params: BlendParams = {
  biasHalfLifeDays: 10,
  errorHalfLifeDays: 20,
  weightExponent: 2,
  hourBlocksPerDay: 1,
  leadGrouping: [[1], [2, 3]],
  minSamples: 10,
  errorFloor: 0.05,
  minWeight: 0,
  maxWeight: 1,
};

/** Générateur pseudo-aléatoire déterministe (LCG), pour des séries reproductibles. */
function createNoise(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296 - 0.5;
  };
}

const truth = (position: number): number => 12 + 6 * Math.sin((2 * Math.PI * position) / 24);

function series(build: (position: number) => number): Float64Array {
  return emptySeries(axis).map((_, position) => build(position));
}

/** Deux modèles : A biaisé de +2 °C et peu bruité, B sans biais mais deux fois plus bruité. */
function createInput(): SimulationInput {
  const noiseA = createNoise(1);
  const noiseB = createNoise(2);
  const a = series((position) => truth(position) + 2 + noiseA());
  const b = series((position) => truth(position) + 2 * noiseB());
  return {
    axis,
    observation: series(truth),
    forecasts: [
      [a, a, a],
      [b, b, b],
    ],
    observationDelayHours: DELAY,
  };
}

describe('simulation du mélange', () => {
  it('fait mieux que chaque modèle seul et que la moyenne simple', () => {
    const input = createInput();
    const result = simulateBlend(input, params).get(1);
    assert.ok(result !== undefined);
    const [a, b] = [input.forecasts[0]?.[0], input.forecasts[1]?.[0]];
    assert.ok(a !== undefined && b !== undefined);
    const mean = simpleMean(input, 1);
    const positions = commonPositions(
      [result.blend, a, b, mean],
      input.observation,
      24 * 20,
      axis.length,
    );
    const blend = scoreSeries(result.blend, input.observation, positions);
    assert.ok(blend.mae < scoreSeries(a, input.observation, positions).mae);
    assert.ok(blend.mae < scoreSeries(b, input.observation, positions).mae);
    assert.ok(blend.mae < scoreSeries(mean, input.observation, positions).mae);
    assert.ok(Math.abs(blend.bias) < 0.05, `biais résiduel : ${blend.bias}`);
  });

  it('corrige le biais de +2 °C du modèle A', () => {
    const input = createInput();
    const corrected = simulateBlend(input, params).get(1)?.corrected[0];
    assert.ok(corrected !== undefined);
    const positions = commonPositions([corrected], input.observation, 24 * 20, axis.length);
    assert.ok(Math.abs(scoreSeries(corrected, input.observation, positions).bias) < 0.05);
  });

  it("n'utilise aucune observation postérieure à l'émission de la prévision", () => {
    const input = createInput();
    const reference = simulateBlend(input, params);
    const cut = 24 * 30;
    // On falsifie toutes les observations à partir de `cut`.
    const tampered = {
      ...input,
      observation: input.observation.map((value, position) =>
        position >= cut ? value + 50 : value,
      ),
    };
    const result = simulateBlend(tampered, params);
    for (const lead of [1, 2, 3]) {
      const expected = reference.get(lead)?.blend;
      const actual = result.get(lead)?.blend;
      assert.ok(expected !== undefined && actual !== undefined);
      // Une prévision émise avant que la première observation falsifiée soit publiée ne doit pas changer.
      const lastUntouched = cut + DELAY + 24 * lead - 1;
      for (let position = 0; position <= lastUntouched; position += 1) {
        assert.equal(actual[position], expected[position], `J+${lead}, position ${position}`);
      }
      // Et la falsification doit bien se voir ensuite : le test ne passe pas à vide.
      assert.notEqual(actual[lastUntouched + 24 * 5], expected[lastUntouched + 24 * 5]);
    }
  });

  it('se passe d’un modèle absent et ne rend rien quand tous manquent', () => {
    const input = createInput();
    const missing = emptySeries(axis);
    const partial = {
      ...input,
      forecasts: [[missing, missing, missing], input.forecasts[1] ?? []],
    };
    const result = simulateBlend(partial, params).get(1);
    assert.ok(result !== undefined);
    assert.ok(Number.isFinite(result.blend[24 * 40]));
    assert.equal(result.spread[24 * 40], 0);
    const none = simulateBlend(
      { ...input, forecasts: [[missing], [missing]] },
      { ...params, leadGrouping: [[1]] },
    ).get(1);
    assert.ok(none !== undefined && none.blend.every((value) => Number.isNaN(value)));
  });

  it('ignore les trous dans les observations', () => {
    const input = createInput();
    const holed = {
      ...input,
      observation: input.observation.map((value, position) =>
        position % 5 === 0 ? Number.NaN : value,
      ),
    };
    const result = simulateBlend(holed, params).get(1);
    assert.ok(result !== undefined && Number.isFinite(result.blend[24 * 40]));
  });
});

describe('meilleur modèle sur la fenêtre précédente', () => {
  it('désigne le modèle le plus précis, sans regarder le futur', () => {
    const input = createInput();
    const options = { windowDays: 10, minSamples: 24 };
    const best = bestModelOnPreviousWindow(input, 1, options);
    const b = input.forecasts[1]?.[0];
    assert.ok(b !== undefined);
    // B (sans biais) a la plus petite erreur brute : c'est lui qui est désigné.
    assert.equal(best[24 * 40], b[24 * 40]);
    // Pas de désignation tant que la fenêtre est vide.
    assert.ok(Number.isNaN(best[10]));

    const cut = 24 * 30;
    const tampered = {
      ...input,
      observation: input.observation.map((value, position) =>
        position >= cut ? value + 2 : value,
      ),
    };
    const after = bestModelOnPreviousWindow(tampered, 1, options);
    for (let position = 0; position <= cut + DELAY + 24 - 1; position += 1) {
      assert.equal(after[position], best[position]);
    }
    // Une fois les observations décalées de +2 °C publiées, c'est A (biaisé de +2 °C) qui devient le meilleur.
    const a = input.forecasts[0]?.[0];
    assert.equal(after[24 * 55], a?.[24 * 55]);
  });
});
