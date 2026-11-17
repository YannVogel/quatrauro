import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { computeWeights } from '../logic/weights.ts';

const sum = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0);
const close = (actual: number | undefined, expected: number): void => {
  assert.ok(actual !== undefined && Math.abs(actual - expected) < 1e-12, `${actual} ≠ ${expected}`);
};

describe('pondération des modèles', () => {
  it('donne des poids égaux à des erreurs égales', () => {
    const weights = computeWeights([1.2, 1.2, 1.2], { exponent: 2, errorFloor: 0.1 });
    weights.forEach((weight) => close(weight, 1 / 3));
  });

  it("fait peser plus lourd un modèle deux fois plus précis, dans la proportion de l'exposant", () => {
    const linear = computeWeights([0.5, 1], { exponent: 1, errorFloor: 0.1 });
    close((linear[0] ?? 0) / (linear[1] ?? 1), 2);
    const squared = computeWeights([0.5, 1], { exponent: 2, errorFloor: 0.1 });
    close((squared[0] ?? 0) / (squared[1] ?? 1), 4);
  });

  it('somme à 1', () => {
    close(sum(computeWeights([0.4, 1.7, 0.9, null], { exponent: 2, errorFloor: 0.1 })), 1);
  });

  it('donne un poids neutre à un modèle sans historique', () => {
    const weights = computeWeights([0.5, 1, null], { exponent: 1, errorFloor: 0.1 });
    // Poids bruts 2 et 1 ; le modèle sans historique reçoit leur moyenne, 1,5.
    close(weights[2], 1.5 / 4.5);
  });

  it("répartit également quand aucun modèle n'a d'historique", () => {
    computeWeights([null, null], { exponent: 2, errorFloor: 0.1 }).forEach((weight) => close(weight, 0.5));
  });

  it('donne tout le poids au seul modèle disponible', () => {
    assert.deepEqual(computeWeights([0.8], { exponent: 2, errorFloor: 0.1 }), [1]);
    assert.deepEqual(computeWeights([], { exponent: 2, errorFloor: 0.1 }), []);
  });

  it("borne l'avantage d'un modèle parfait par l'erreur plancher", () => {
    const weights = computeWeights([0, 1], { exponent: 1, errorFloor: 0.25 });
    close((weights[0] ?? 0) / (weights[1] ?? 1), 4);
  });

  it('ignore les erreurs avec un exposant nul', () => {
    computeWeights([0.2, 3], { exponent: 0, errorFloor: 0.1 }).forEach((weight) => close(weight, 0.5));
  });
});
