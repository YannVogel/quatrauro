import { EMPTY_FREQUENCY, addOutcome, smoothedRate } from '../frequency';
import { isotonic } from '../isotonic';
import {
  EMPTY_RAIN_CALIBRATION,
  agreementClassOf,
  rainAgreement,
  rainProbability,
  updateRainCalibration,
} from '../rain';
import type { RainCalibration } from '../rain';

const OPTIONS = { priorStrength: 20, minSamples: 50 };

function feed(calibration: RainCalibration, agreement: number, rainy: number, dry: number) {
  let result = calibration;
  for (let index = 0; index < rainy; index += 1)
    result = updateRainCalibration(result, agreement, true);
  for (let index = 0; index < dry; index += 1)
    result = updateRainCalibration(result, agreement, false);
  return result;
}

describe('fréquence lissée', () => {
  it("part de l'a priori et rejoint le taux observé", () => {
    expect(smoothedRate(EMPTY_FREQUENCY, 0.3, 10)).toBe(0.3);
    let frequency = EMPTY_FREQUENCY;
    for (let index = 0; index < 1000; index += 1)
      frequency = addOutcome(frequency, index % 4 === 0);
    expect(smoothedRate(frequency, 0.9, 10)).toBeCloseTo(0.25, 1);
  });
});

describe('régression isotonique', () => {
  it('laisse une suite déjà monotone', () => {
    expect(isotonic([1, 2, 3], [1, 1, 1], 'increasing')).toEqual([1, 2, 3]);
    expect(isotonic([3, 2, 1], [1, 1, 1], 'decreasing')).toEqual([3, 2, 1]);
  });

  it('fusionne les violations en leur moyenne pondérée', () => {
    expect(isotonic([1, 3, 2], [1, 1, 1], 'increasing')).toEqual([1, 2.5, 2.5]);
    expect(isotonic([1, 3, 0], [1, 3, 1], 'increasing')).toEqual([1, 2.25, 2.25]);
    const merged = isotonic([0.6, 0.8, 0.7], [1, 1, 1], 'decreasing');
    for (const value of merged) expect(value).toBeCloseTo(0.7, 12);
  });

  it('refuse des poids qui ne correspondent pas aux valeurs', () => {
    expect(() => isotonic([1, 2], [1], 'increasing')).toThrow();
  });
});

describe('accord entre modèles sur la pluie', () => {
  it('compte la part des modèles disponibles qui annoncent de la pluie', () => {
    expect(rainAgreement([0, 0.4, 1.2, Number.NaN], 0.2)).toBe(2 / 3);
    expect(rainAgreement([0, 0.1], 0.2)).toBe(0);
    expect(rainAgreement([Number.NaN], 0.2)).toBeNull();
    expect(rainAgreement([], 0.2)).toBeNull();
  });

  it("range l'accord en cinq classes", () => {
    expect([0, 0.2, 0.5, 0.8, 1].map(agreementClassOf)).toEqual([0, 1, 2, 3, 4]);
    expect(agreementClassOf(1 / 3)).toBe(2);
    expect(agreementClassOf(2 / 3)).toBe(3);
  });
});

describe('probabilité de pluie calibrée', () => {
  it("rend l'accord brut tant que l'historique est insuffisant", () => {
    expect(rainProbability(EMPTY_RAIN_CALIBRATION, 0.5, OPTIONS)).toBe(0.5);
  });

  it("rejoint la fréquence observée pour un même degré d'accord", () => {
    // Quand tous les modèles annoncent la pluie, il a plu 6 fois sur 10.
    let calibration = feed(EMPTY_RAIN_CALIBRATION, 1, 600, 400);
    calibration = feed(calibration, 0, 20, 1980);
    expect(rainProbability(calibration, 1, OPTIONS)).toBeCloseTo(0.6, 1);
    expect(rainProbability(calibration, 0, OPTIONS)).toBeLessThan(0.02);
  });

  it("ne baisse jamais quand l'accord augmente", () => {
    // Classe « majorité » artificiellement plus sèche que la classe « moitié ».
    let calibration = feed(EMPTY_RAIN_CALIBRATION, 0, 5, 995);
    calibration = feed(calibration, 0.5, 60, 40);
    calibration = feed(calibration, 0.8, 30, 70);
    calibration = feed(calibration, 1, 90, 10);
    const probabilities = [0, 0.2, 0.5, 0.8, 1].map((agreement) =>
      rainProbability(calibration, agreement, OPTIONS),
    );
    probabilities.slice(1).forEach((probability, index) => {
      expect(probability).toBeGreaterThanOrEqual(probabilities[index] ?? Number.NaN);
    });
  });

  it("ne modifie pas la calibration qu'on lui passe", () => {
    updateRainCalibration(EMPTY_RAIN_CALIBRATION, 1, true);
    expect(EMPTY_RAIN_CALIBRATION.overall.total).toBe(0);
    expect(EMPTY_RAIN_CALIBRATION.byClass.every((frequency) => frequency.total === 0)).toBe(true);
  });
});
