import { BLEND_CONFIG } from '../../blendConfig';
import { EMPTY_DECAYED_MEAN } from '../decayedMean';
import { computeWeights, readError, updateError } from '../weights';
import type { WeightOptions } from '../weights';

/** Sans garde-fous, pour tester la proportion pure. */
const unbounded: WeightOptions = { exponent: 2, errorFloor: 0.05, minWeight: 0, maxWeight: 1 };
const sum = (values: readonly number[]): number =>
  values.reduce((total, value) => total + value, 0);

describe('erreur récente', () => {
  const HALF_LIFE = BLEND_CONFIG.corrected.errorHalfLifeDays;

  it("suit l'erreur absolue, quel que soit son signe", () => {
    let state = EMPTY_DECAYED_MEAN;
    for (let hour = 0; hour < 50; hour += 1) {
      state = updateError(state, hour % 2 === 0 ? 11 : 9, 10, hour, HALF_LIFE);
    }
    expect(readError(state, 10)).toBeCloseTo(1, 9);
  });

  it("est inconnue tant que l'historique est trop court", () => {
    const state = updateError(EMPTY_DECAYED_MEAN, 11, 10, 0, HALF_LIFE);
    expect(readError(state, 10)).toBeNull();
    expect(readError(EMPTY_DECAYED_MEAN, 0)).toBeNull();
  });

  it('ignore une paire incomplète', () => {
    const state = updateError(EMPTY_DECAYED_MEAN, 11, 10, 0, HALF_LIFE);
    expect(updateError(state, null, 10, 1, HALF_LIFE)).toBe(state);
    expect(updateError(state, 11, null, 1, HALF_LIFE)).toBe(state);
    expect(updateError(state, Number.NaN, 10, 1, HALF_LIFE)).toBe(state);
  });
});

describe('poids des modèles', () => {
  it('sont égaux quand les erreurs sont égales', () => {
    for (const weight of computeWeights([1.2, 1.2, 1.2], unbounded))
      expect(weight).toBeCloseTo(1 / 3, 12);
  });

  it("font peser plus lourd un modèle deux fois plus précis, dans la proportion de l'exposant", () => {
    const [linearBest = 0, linearOther = 1] = computeWeights([0.5, 1], {
      ...unbounded,
      exponent: 1,
    });
    expect(linearBest / linearOther).toBeCloseTo(2, 12);
    const [squaredBest = 0, squaredOther = 1] = computeWeights([0.5, 1], unbounded);
    expect(squaredBest / squaredOther).toBeCloseTo(4, 12);
    const [fourthBest = 0, fourthOther = 1] = computeWeights([0.5, 1], {
      ...unbounded,
      exponent: 4,
    });
    expect(fourthBest / fourthOther).toBeCloseTo(16, 12);
  });

  it('somment toujours à 1', () => {
    expect(sum(computeWeights([0.4, 1.7, 0.9, null], unbounded))).toBeCloseTo(1, 12);
    expect(sum(computeWeights([0.4, 1.7, 0.9, null], BLEND_CONFIG.corrected.weights))).toBeCloseTo(
      1,
      12,
    );
    expect(sum(computeWeights([0, 5, 5], BLEND_CONFIG.corrected.weights))).toBeCloseTo(1, 12);
  });

  it('ignorent les erreurs avec un exposant nul', () => {
    for (const weight of computeWeights([0.2, 3], { ...unbounded, exponent: 0 }))
      expect(weight).toBeCloseTo(0.5, 12);
  });

  it("bornent l'avantage d'un modèle parfait par l'erreur plancher", () => {
    const [perfect = 0, other = 1] = computeWeights([0, 1], {
      ...unbounded,
      exponent: 1,
      errorFloor: 0.25,
    });
    expect(perfect / other).toBeCloseTo(4, 12);
  });

  it('donnent un poids neutre à un modèle sans historique', () => {
    const weights = computeWeights([0.5, 1, null], { ...unbounded, exponent: 1 });
    // Poids bruts 2 et 1 ; le modèle sans historique reçoit leur moyenne, 1,5.
    expect(weights[2]).toBeCloseTo(1.5 / 4.5, 12);
  });

  it("se partagent également quand aucun modèle n'a d'historique", () => {
    for (const weight of computeWeights([null, null], unbounded))
      expect(weight).toBeCloseTo(0.5, 12);
  });

  it('donnent tout le poids au seul modèle disponible, malgré le poids maximal', () => {
    expect(computeWeights([0.8], BLEND_CONFIG.corrected.weights)).toEqual([1]);
    expect(computeWeights([null], BLEND_CONFIG.corrected.weights)).toEqual([1]);
    expect(computeWeights([], BLEND_CONFIG.corrected.weights)).toEqual([]);
  });

  it('se renormalisent quand un modèle est retiré', () => {
    const withAll = computeWeights([0.5, 1, 1], unbounded);
    const withoutLast = computeWeights([0.5, 1], unbounded);
    expect(sum(withoutLast)).toBeCloseTo(1, 12);
    // Le rapport entre les deux modèles restants ne change pas.
    expect((withoutLast[0] ?? 0) / (withoutLast[1] ?? 1)).toBeCloseTo(
      (withAll[0] ?? 0) / (withAll[1] ?? 1),
      12,
    );
  });
});

describe('garde-fous des poids', () => {
  const bounded: WeightOptions = { exponent: 4, errorFloor: 0.05, minWeight: 0.1, maxWeight: 0.6 };

  it('empêchent un modèle de monopoliser le mélange sur un coup de chance', () => {
    // Sans borne, le premier modèle pèserait plus de 99 %.
    const weights = computeWeights([0.1, 1, 1], bounded);
    expect(weights[0]).toBeCloseTo(0.6, 12);
    expect(weights[1]).toBeCloseTo(0.2, 12);
    expect(weights[2]).toBeCloseTo(0.2, 12);
  });

  it('tiennent la somme quand le plafond et le plancher sont atteints en même temps', () => {
    // Un modèle presque parfait et trois très mauvais : 0,6 pour le premier, le reste partagé.
    const weights = computeWeights([0.05, 3, 3, 3], bounded);
    expect(weights[0]).toBeCloseTo(0.6, 12);
    for (const weight of weights.slice(1)) expect(weight).toBeCloseTo(0.4 / 3, 12);
    expect(sum(weights)).toBeCloseTo(1, 12);
  });

  it('gardent une voix à un modèle en mauvaise passe', () => {
    const weights = computeWeights([1, 1, 5], bounded);
    expect(weights[2]).toBeCloseTo(0.1, 12);
    expect(weights[0]).toBeCloseTo(0.45, 12);
    expect(sum(weights)).toBeCloseTo(1, 12);
  });

  it.each([
    [[0.3, 0.9, 1.4, 2.2, 0.05]],
    [[1, 1, 1, 1, 1]],
    [[0.01, 0.01, 4, 4, 4]],
    [[null, 0.4, null, 2, 0.7]],
    [[0.2, 6]],
  ])('respectent les bornes et la somme pour %j', (errors) => {
    const weights = computeWeights(errors, bounded);
    expect(sum(weights)).toBeCloseTo(1, 12);
    for (const weight of weights) {
      expect(weight).toBeGreaterThanOrEqual(0.1 - 1e-12);
      expect(weight).toBeLessThanOrEqual(0.6 + 1e-12);
    }
  });

  it("s'effacent devant le partage égal quand il y a trop peu de modèles", () => {
    // Deux modèles ne peuvent pas peser chacun au plus 40 % : la borne devient 50 %.
    const weights = computeWeights([0.1, 1], { ...bounded, maxWeight: 0.4 });
    expect(weights[0]).toBeCloseTo(0.5, 12);
    expect(weights[1]).toBeCloseTo(0.5, 12);
  });

  it('ne changent rien quand les poids sont déjà dans les bornes', () => {
    expect(computeWeights([1, 1.1, 1.2], bounded)).toEqual(
      computeWeights([1, 1.1, 1.2], { ...bounded, minWeight: 0, maxWeight: 1 }),
    );
  });
});
