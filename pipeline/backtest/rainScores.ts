// Mesures de qualité d'une annonce de pluie (oui / non) et d'une probabilité de pluie.

export type Contingency = {
  /** Pluie annoncée et observée. */
  readonly hits: number;
  /** Pluie observée, pas annoncée. */
  readonly misses: number;
  /** Pluie annoncée, pas observée. */
  readonly falseAlarms: number;
  /** Ni annoncée ni observée. */
  readonly correctNegatives: number;
};

export const EMPTY_CONTINGENCY: Contingency = {
  hits: 0,
  misses: 0,
  falseAlarms: 0,
  correctNegatives: 0,
};

export function addToContingency(
  table: Contingency,
  announced: boolean,
  observed: boolean,
): Contingency {
  if (announced && observed) return { ...table, hits: table.hits + 1 };
  if (!announced && observed) return { ...table, misses: table.misses + 1 };
  if (announced) return { ...table, falseAlarms: table.falseAlarms + 1 };
  return { ...table, correctNegatives: table.correctNegatives + 1 };
}

export function mergeContingencies(tables: readonly Contingency[]): Contingency {
  return tables.reduce(
    (total, table) => ({
      hits: total.hits + table.hits,
      misses: total.misses + table.misses,
      falseAlarms: total.falseAlarms + table.falseAlarms,
      correctNegatives: total.correctNegatives + table.correctNegatives,
    }),
    EMPTY_CONTINGENCY,
  );
}

export function contingencyTotal(table: Contingency): number {
  return table.hits + table.misses + table.falseAlarms + table.correctNegatives;
}

/** Taux de bonnes annonces, pluie et temps sec confondus. */
export function accuracy(table: Contingency): number {
  return (table.hits + table.correctNegatives) / contingencyTotal(table);
}

/**
 * Indice de succès critique : parmi les cas où la pluie a été annoncée ou observée, la part
 * de ceux où elle a été annoncée et observée. Contrairement au taux de bonnes annonces, il
 * n'est pas gonflé par les nombreuses heures sèches faciles à prévoir.
 */
export function criticalSuccessIndex(table: Contingency): number {
  return table.hits / (table.hits + table.misses + table.falseAlarms);
}

/** Score de Brier : erreur quadratique moyenne d'une probabilité (0 = parfait). */
export function brierScore(probabilities: readonly number[], outcomes: readonly boolean[]): number {
  if (probabilities.length !== outcomes.length)
    throw new Error('Autant de résultats que de probabilités sont attendus');
  const total = probabilities.reduce(
    (sum, probability, index) => sum + (probability - (outcomes[index] ? 1 : 0)) ** 2,
    0,
  );
  return total / probabilities.length;
}

export type CalibrationBin = {
  readonly from: number;
  readonly to: number;
  readonly count: number;
  /** Moyenne des valeurs annoncées dans la classe. */
  readonly announced: number;
  /** Fréquence réellement observée dans la classe. */
  readonly observed: number;
};

/** Compare, par classe de valeur annoncée, l'annonce moyenne à la fréquence observée. */
export function calibrationBins(
  announced: readonly number[],
  outcomes: readonly boolean[],
  bounds: readonly number[],
): CalibrationBin[] {
  return bounds.slice(0, -1).map((from, index) => {
    const to = bounds[index + 1] ?? from;
    const isLast = index === bounds.length - 2;
    let count = 0;
    let sum = 0;
    let hits = 0;
    announced.forEach((value, at) => {
      if (value < from || (isLast ? value > to : value >= to)) return;
      count += 1;
      sum += value;
      hits += outcomes[at] ? 1 : 0;
    });
    return {
      from,
      to,
      count,
      announced: count === 0 ? Number.NaN : sum / count,
      observed: count === 0 ? Number.NaN : hits / count,
    };
  });
}
