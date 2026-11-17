import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { EMPTY_FREQUENCY, addOutcome, smoothedRate } from '../logic/frequency.ts';
import { isotonic } from '../logic/isotonic.ts';
import {
  EMPTY_RAIN_CALIBRATION,
  agreementClassOf,
  rainAgreement,
  rainProbability,
  updateRainCalibration,
} from '../logic/rain.ts';
import type { RainCalibration } from '../logic/rain.ts';

const OPTIONS = { priorStrength: 20, minSamples: 50 };

function feed(calibration: RainCalibration, agreement: number, rainy: number, dry: number): RainCalibration {
  let result = calibration;
  for (let index = 0; index < rainy; index += 1) result = updateRainCalibration(result, agreement, true);
  for (let index = 0; index < dry; index += 1) result = updateRainCalibration(result, agreement, false);
  return result;
}

describe('fréquence lissée', () => {
  it("part de l'a priori et rejoint le taux observé", () => {
    assert.equal(smoothedRate(EMPTY_FREQUENCY, 0.3, 10), 0.3);
    let frequency = EMPTY_FREQUENCY;
    for (let index = 0; index < 1000; index += 1) frequency = addOutcome(frequency, index % 4 === 0);
    assert.ok(Math.abs(smoothedRate(frequency, 0.9, 10) - 0.25) < 0.01);
  });
});

describe('régression isotonique', () => {
  it('laisse une suite déjà monotone', () => {
    assert.deepEqual(isotonic([1, 2, 3], [1, 1, 1], 'increasing'), [1, 2, 3]);
    assert.deepEqual(isotonic([3, 2, 1], [1, 1, 1], 'decreasing'), [3, 2, 1]);
  });

  it('fusionne les violations en leur moyenne pondérée', () => {
    assert.deepEqual(isotonic([1, 3, 2], [1, 1, 1], 'increasing'), [1, 2.5, 2.5]);
    assert.deepEqual(isotonic([1, 3, 0], [1, 3, 1], 'increasing'), [1, 2.25, 2.25]);
    assert.deepEqual(isotonic([0.6, 0.8, 0.7], [1, 1, 1], 'decreasing'), [0.7, 0.7, 0.7]);
  });

  it('refuse des poids qui ne correspondent pas aux valeurs', () => {
    assert.throws(() => isotonic([1, 2], [1], 'increasing'));
  });
});

describe('accord entre modèles sur la pluie', () => {
  it('compte la part des modèles disponibles qui annoncent de la pluie', () => {
    assert.equal(rainAgreement([0, 0.4, 1.2, Number.NaN], 0.2), 2 / 3);
    assert.equal(rainAgreement([0, 0.1], 0.2), 0);
    assert.equal(rainAgreement([Number.NaN], 0.2), null);
    assert.equal(rainAgreement([], 0.2), null);
  });

  it('range l’accord en cinq classes', () => {
    assert.deepEqual([0, 0.2, 0.5, 0.8, 1].map(agreementClassOf), [0, 1, 2, 3, 4]);
    assert.equal(agreementClassOf(1 / 3), 2);
    assert.equal(agreementClassOf(2 / 3), 3);
  });
});

describe('probabilité de pluie calibrée', () => {
  it("rend l'accord brut tant que l'historique est insuffisant", () => {
    assert.equal(rainProbability(EMPTY_RAIN_CALIBRATION, 0.5, OPTIONS), 0.5);
  });

  it('rejoint la fréquence observée pour un même degré d’accord', () => {
    // Quand tous les modèles annoncent la pluie, il a plu 6 fois sur 10.
    let calibration = feed(EMPTY_RAIN_CALIBRATION, 1, 600, 400);
    calibration = feed(calibration, 0, 20, 1980);
    assert.ok(Math.abs(rainProbability(calibration, 1, OPTIONS) - 0.6) < 0.02);
    assert.ok(rainProbability(calibration, 0, OPTIONS) < 0.02);
  });

  it("ne baisse jamais quand l'accord augmente", () => {
    // Classe « majorité » artificiellement plus sèche que la classe « moitié ».
    let calibration = feed(EMPTY_RAIN_CALIBRATION, 0, 5, 995);
    calibration = feed(calibration, 0.5, 60, 40);
    calibration = feed(calibration, 0.8, 30, 70);
    calibration = feed(calibration, 1, 90, 10);
    const probabilities = [0, 0.2, 0.5, 0.8, 1].map((agreement) => rainProbability(calibration, agreement, OPTIONS));
    probabilities.slice(1).forEach((probability, index) => {
      assert.ok(probability >= (probabilities[index] ?? Number.NaN), `${probabilities.join(', ')}`);
    });
  });

  it("ne modifie pas la calibration qu'on lui passe", () => {
    updateRainCalibration(EMPTY_RAIN_CALIBRATION, 1, true);
    assert.equal(EMPTY_RAIN_CALIBRATION.overall.total, 0);
    assert.ok(EMPTY_RAIN_CALIBRATION.byClass.every((frequency) => frequency.total === 0));
  });
});
