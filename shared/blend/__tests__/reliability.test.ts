import { BLEND_CONFIG } from '../../blendConfig';
import {
  countAgreeingModels,
  dayReliability,
  emptyReliabilityTable,
  rainClassOf,
  reliabilityIndex,
  reliabilityLabel,
  spreadClassOf,
  updateReliability,
} from '../reliability';
import type { ReliabilityOptions, ReliabilityTable, Situation } from '../reliability';

const OPTIONS: ReliabilityOptions = {
  spreadThresholds: [0.5, 1],
  uncertainRain: { from: 0.2, to: 0.8 },
  priorStrength: 10,
  minSamples: 30,
  singleModelCap: 0.5,
};

const situation = (spread: number, rainProbability = 0.02, modelCount = 4): Situation => ({
  spread,
  rainProbability,
  modelCount,
});
const calm = situation(0.2);
const split = situation(1.5);

function feed(table: ReliabilityTable, days: Situation, held: number, missed: number) {
  let result = table;
  for (let index = 0; index < held; index += 1)
    result = updateReliability(result, days, true, OPTIONS);
  for (let index = 0; index < missed; index += 1)
    result = updateReliability(result, days, false, OPTIONS);
  return result;
}

describe('indice de fiabilité', () => {
  it('range le désaccord et le signal de pluie en classes', () => {
    const thresholds = OPTIONS.spreadThresholds;
    expect([0.1, 0.5, 0.99, 1, 3].map((spread) => spreadClassOf(spread, thresholds))).toEqual([
      0, 1, 1, 2, 2,
    ]);
    expect(
      [0, 0.2, 0.5, 0.8, 0.95].map((probability) => rainClassOf(probability, OPTIONS)),
    ).toEqual([0, 1, 1, 1, 0]);
  });

  it("est indisponible tant que l'historique est insuffisant", () => {
    const table = feed(emptyReliabilityTable(OPTIONS), calm, 10, 2);
    expect(reliabilityIndex(table, calm, OPTIONS)).toBeNull();
    expect(reliabilityIndex(emptyReliabilityTable(OPTIONS), calm, OPTIONS)).toBeNull();
  });

  it('rejoint la part des jours tenus dans la même situation', () => {
    let table = feed(emptyReliabilityTable(OPTIONS), calm, 900, 100);
    table = feed(table, split, 400, 600);
    expect(reliabilityIndex(table, calm, OPTIONS)).toBeCloseTo(0.9, 1);
    expect(reliabilityIndex(table, split, OPTIONS)).toBeCloseTo(0.4, 1);
  });

  it('est élevé quand les modèles sont identiques, bas quand ils sont très dispersés', () => {
    let table = feed(emptyReliabilityTable(OPTIONS), situation(0), 190, 10);
    table = feed(table, situation(4), 40, 160);
    const agreeing = reliabilityIndex(table, situation(0), OPTIONS) ?? Number.NaN;
    const scattered = reliabilityIndex(table, situation(4), OPTIONS) ?? Number.NaN;
    expect(agreeing).toBeGreaterThan(0.9);
    expect(scattered).toBeLessThan(0.3);
  });

  it('ne monte jamais quand le désaccord entre modèles augmente', () => {
    // Le niveau de désaccord intermédiaire a été, par hasard, mieux tenu que le niveau faible.
    let table = feed(emptyReliabilityTable(OPTIONS), calm, 60, 40);
    table = feed(table, situation(0.7), 80, 20);
    table = feed(table, split, 30, 70);
    const indices = [0.2, 0.7, 1.5].map(
      (spread) => reliabilityIndex(table, situation(spread), OPTIONS) ?? Number.NaN,
    );
    expect(indices[1]).toBeLessThanOrEqual(indices[0] ?? Number.NaN);
    expect(indices[2]).toBeLessThanOrEqual(indices[1] ?? Number.NaN);
  });

  it('décroît sur toute une gamme de désaccords, toutes choses égales par ailleurs', () => {
    let table = emptyReliabilityTable(OPTIONS);
    // Historique en désordre : chaque niveau a un taux différent, pas toujours décroissant.
    table = feed(table, situation(0.1), 70, 30);
    table = feed(table, situation(0.6), 75, 25);
    table = feed(table, situation(2), 20, 80);
    let previous = Number.POSITIVE_INFINITY;
    for (let spread = 0; spread <= 3; spread += 0.05) {
      const index = reliabilityIndex(table, situation(spread), OPTIONS) ?? Number.NaN;
      expect(index).toBeLessThanOrEqual(previous);
      previous = index;
    }
  });

  it('se rabat sur le taux de la tranche pour une situation jamais vue', () => {
    const table = feed(emptyReliabilityTable(OPTIONS), calm, 70, 30);
    expect(reliabilityIndex(table, situation(0.2, 0.5), OPTIONS)).toBeCloseTo(0.7, 12);
  });

  it('est plafonné quand un seul modèle couvre le jour', () => {
    const table = feed(emptyReliabilityTable(OPTIONS), calm, 950, 50);
    expect(reliabilityIndex(table, situation(0.2, 0.02, 4), OPTIONS)).toBeGreaterThan(0.9);
    expect(reliabilityIndex(table, situation(0.2, 0.02, 1), OPTIONS)).toBe(0.5);
    expect(reliabilityIndex(table, situation(0.2, 0.02, 2), OPTIONS)).toBeGreaterThan(0.9);
  });

  it('ne relève pas un indice déjà sous le plafond', () => {
    const table = feed(emptyReliabilityTable(OPTIONS), split, 20, 180);
    const alone = reliabilityIndex(table, situation(1.5, 0.02, 1), OPTIONS) ?? Number.NaN;
    expect(alone).toBeLessThan(0.2);
  });

  it("ne modifie pas la table qu'on lui passe", () => {
    const table = emptyReliabilityTable(OPTIONS);
    updateReliability(table, calm, true, OPTIONS);
    expect(table.overall.total).toBe(0);
    expect(table.cells.flat().every((frequency) => frequency.total === 0)).toBe(true);
  });
});

describe('libellés', () => {
  const thresholds = BLEND_CONFIG.reliability.labels;

  it('suivent les seuils de la configuration', () => {
    expect(reliabilityLabel(0.85, thresholds)).toBe('sure');
    expect(reliabilityLabel(thresholds.sure, thresholds)).toBe('sure');
    expect(reliabilityLabel(0.65, thresholds)).toBe('likely');
    expect(reliabilityLabel(thresholds.likely, thresholds)).toBe('likely');
    expect(reliabilityLabel(0.3, thresholds)).toBe('uncertain');
  });

  it('rangent le plafond du modèle seul dans « Incertain »', () => {
    expect(reliabilityLabel(BLEND_CONFIG.reliability.singleModelCap, thresholds)).toBe('uncertain');
  });
});

describe("modèles d'accord", () => {
  it('compte les modèles proches de la valeur combinée', () => {
    expect(countAgreeingModels([15.2, 16.1, 17.4, 16.9], 16.5, 1)).toBe(3);
    expect(countAgreeingModels([15, 16, 17], 16, 1)).toBe(3);
    expect(countAgreeingModels([10, 20], 15, 1)).toBe(0);
  });

  it('rend zéro sans modèle, et rien sans valeur combinée', () => {
    expect(countAgreeingModels([], 16, 1)).toBe(0);
    expect(countAgreeingModels([15, 16], null, 1)).toBeNull();
  });
});

describe("fiabilité d'un jour", () => {
  const settings = { ...OPTIONS, labels: { sure: 0.8, likely: 0.6 }, agreementTolerance: 1 };
  const table = feed(emptyReliabilityTable(OPTIONS), calm, 900, 100);
  const day = { spread: 0.2, rainProbability: 0.02 };

  it("réunit l'indice, son libellé et les modèles d'accord", () => {
    const result = dayReliability(
      table,
      { ...day, modelValues: [15.2, 16.1, 17.4, 16.9], combined: 16.5 },
      settings,
    );
    expect(result.index).toBeCloseTo(0.9, 1);
    expect(result).toMatchObject({ label: 'sure', modelsAgreeing: 3, modelsTotal: 4 });
  });

  it('plafonne et déclasse un jour couvert par un seul modèle', () => {
    expect(
      dayReliability(table, { ...day, modelValues: [16.5], combined: 16.5 }, settings),
    ).toEqual({ index: 0.5, label: 'uncertain', modelsAgreeing: 1, modelsTotal: 1 });
  });

  it("n'invente ni indice ni libellé sans historique", () => {
    const result = dayReliability(
      emptyReliabilityTable(OPTIONS),
      { ...day, modelValues: [15, 16], combined: 15.5 },
      settings,
    );
    expect(result).toEqual({ index: null, label: null, modelsAgreeing: 2, modelsTotal: 2 });
  });
});
