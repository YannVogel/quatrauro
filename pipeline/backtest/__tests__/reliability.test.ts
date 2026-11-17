import assert from 'node:assert/strict';

import {
  emptyReliabilityTable,
  rainClassOf,
  reliabilityIndex,
  reliabilityLabel,
  spreadClassOf,
  updateReliability,
} from '../logic/reliability.ts';
import type { ReliabilityTable, Situation } from '../logic/reliability.ts';

const OPTIONS = {
  spreadThresholds: [0.5, 1],
  uncertainRain: { from: 0.2, to: 0.8 },
  priorStrength: 10,
  minSamples: 30,
};

const calm: Situation = { spread: 0.2, rainProbability: 0.02 };
const split: Situation = { spread: 1.5, rainProbability: 0.02 };

function feed(
  table: ReliabilityTable,
  situation: Situation,
  held: number,
  missed: number,
): ReliabilityTable {
  let result = table;
  for (let index = 0; index < held; index += 1)
    result = updateReliability(result, situation, true, OPTIONS);
  for (let index = 0; index < missed; index += 1)
    result = updateReliability(result, situation, false, OPTIONS);
  return result;
}

describe('indice de fiabilité', () => {
  it('range le désaccord et le signal de pluie en classes', () => {
    assert.deepEqual(
      [0.1, 0.5, 0.99, 1, 3].map((spread) => spreadClassOf(spread, OPTIONS.spreadThresholds)),
      [0, 1, 1, 2, 2],
    );
    assert.deepEqual(
      [0, 0.2, 0.5, 0.8, 0.95].map((probability) => rainClassOf(probability, OPTIONS)),
      [0, 1, 1, 1, 0],
    );
  });

  it("est indisponible tant que l'historique est insuffisant", () => {
    const table = feed(emptyReliabilityTable(OPTIONS), calm, 10, 2);
    assert.equal(reliabilityIndex(table, calm, OPTIONS), null);
  });

  it('rejoint la part des jours tenus dans la même situation', () => {
    let table = feed(emptyReliabilityTable(OPTIONS), calm, 900, 100);
    table = feed(table, split, 400, 600);
    assert.ok(Math.abs((reliabilityIndex(table, calm, OPTIONS) ?? Number.NaN) - 0.9) < 0.01);
    assert.ok(Math.abs((reliabilityIndex(table, split, OPTIONS) ?? Number.NaN) - 0.4) < 0.01);
  });

  it('ne monte jamais quand le désaccord entre modèles augmente', () => {
    // Le niveau de désaccord intermédiaire a été, par hasard, mieux tenu que le niveau faible.
    let table = feed(emptyReliabilityTable(OPTIONS), calm, 60, 40);
    table = feed(table, { spread: 0.7, rainProbability: 0.02 }, 80, 20);
    table = feed(table, split, 30, 70);
    const indices = [0.2, 0.7, 1.5].map((spread) =>
      reliabilityIndex(table, { spread, rainProbability: 0.02 }, OPTIONS),
    );
    assert.ok((indices[1] ?? Number.NaN) <= (indices[0] ?? Number.NaN));
    assert.ok((indices[2] ?? Number.NaN) <= (indices[1] ?? Number.NaN));
  });

  it('se rabat sur le taux de la tranche pour une situation jamais vue', () => {
    const table = feed(emptyReliabilityTable(OPTIONS), calm, 70, 30);
    const unseen = reliabilityIndex(table, { spread: 0.2, rainProbability: 0.5 }, OPTIONS);
    assert.ok(Math.abs((unseen ?? Number.NaN) - 0.7) < 1e-12);
  });

  it('donne un libellé selon les seuils', () => {
    const thresholds = { sure: 0.8, likely: 0.6 };
    assert.equal(reliabilityLabel(0.85, thresholds), 'sure');
    assert.equal(reliabilityLabel(0.8, thresholds), 'sure');
    assert.equal(reliabilityLabel(0.65, thresholds), 'likely');
    assert.equal(reliabilityLabel(0.3, thresholds), 'uncertain');
  });
});
