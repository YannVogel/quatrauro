// Indice de fiabilité d'un jour : la part des jours passés, dans une situation semblable, où la
// prévision a été tenue. « Situation semblable » = même tranche d'échéance (une table par
// tranche, tenue par l'appelant), même niveau de désaccord entre modèles, même netteté du
// signal de pluie. L'indice utilise donc l'écart entre modèles, l'échéance et l'erreur passée.

import { EMPTY_FREQUENCY, addOutcome, smoothedRate } from '../../../shared/blend/frequency.ts';
import type { Frequency } from '../../../shared/blend/frequency.ts';
import { isotonic } from '../../../shared/blend/isotonic.ts';

export type ReliabilityOptions = {
  /** Seuils croissants de l'écart-type entre modèles (°C) : n seuils donnent n + 1 niveaux de désaccord. */
  readonly spreadThresholds: readonly number[];
  /** Entre ces deux probabilités, le signal de pluie est jugé incertain. */
  readonly uncertainRain: { readonly from: number; readonly to: number };
  readonly priorStrength: number;
  /** En dessous de ce nombre de jours vérifiés, l'indice est indisponible. */
  readonly minSamples: number;
};

export type Situation = {
  /** Écart-type moyen entre les modèles sur la journée. */
  readonly spread: number;
  /** Probabilité de pluie du jour, de 0 à 1. */
  readonly rainProbability: number;
};

const RAIN_CLASS_COUNT = 2;

/** `cells[signal de pluie][niveau de désaccord]`. */
export type ReliabilityTable = {
  readonly overall: Frequency;
  readonly cells: readonly (readonly Frequency[])[];
};

export function emptyReliabilityTable(options: ReliabilityOptions): ReliabilityTable {
  return {
    overall: EMPTY_FREQUENCY,
    cells: Array.from({ length: RAIN_CLASS_COUNT }, () =>
      Array.from({ length: options.spreadThresholds.length + 1 }, () => EMPTY_FREQUENCY),
    ),
  };
}

export function spreadClassOf(spread: number, thresholds: readonly number[]): number {
  const index = thresholds.findIndex((threshold) => spread < threshold);
  return index === -1 ? thresholds.length : index;
}

/** 0 : signal net (pluie quasi sûre ou quasi exclue) ; 1 : signal incertain. */
export function rainClassOf(probability: number, options: ReliabilityOptions): number {
  return probability >= options.uncertainRain.from && probability <= options.uncertainRain.to
    ? 1
    : 0;
}

export function updateReliability(
  table: ReliabilityTable,
  situation: Situation,
  held: boolean,
  options: ReliabilityOptions,
): ReliabilityTable {
  const rainClass = rainClassOf(situation.rainProbability, options);
  const spreadClass = spreadClassOf(situation.spread, options.spreadThresholds);
  return {
    overall: addOutcome(table.overall, held),
    cells: table.cells.map((row, rowIndex) =>
      row.map((frequency, columnIndex) =>
        rowIndex === rainClass && columnIndex === spreadClass
          ? addOutcome(frequency, held)
          : frequency,
      ),
    ),
  };
}

/**
 * Indice de 0 à 1, ou `null` tant que l'historique est insuffisant. À signal de pluie égal,
 * il ne monte jamais quand le désaccord entre modèles augmente.
 */
export function reliabilityIndex(
  table: ReliabilityTable,
  situation: Situation,
  options: ReliabilityOptions,
): number | null {
  if (table.overall.total < options.minSamples) return null;
  const baseRate = table.overall.hits / table.overall.total;
  const row = table.cells[rainClassOf(situation.rainProbability, options)] ?? [];
  const rates = row.map((frequency) => smoothedRate(frequency, baseRate, options.priorStrength));
  const weights = row.map((frequency) => frequency.total + options.priorStrength);
  return (
    isotonic(rates, weights, 'decreasing')[
      spreadClassOf(situation.spread, options.spreadThresholds)
    ] ?? null
  );
}

export type ReliabilityLabel = 'sure' | 'likely' | 'uncertain';

export type LabelThresholds = { readonly sure: number; readonly likely: number };

export function reliabilityLabel(index: number, thresholds: LabelThresholds): ReliabilityLabel {
  if (index >= thresholds.sure) return 'sure';
  return index >= thresholds.likely ? 'likely' : 'uncertain';
}
