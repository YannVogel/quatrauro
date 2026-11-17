// Moyenne mobile à pondération exponentielle, indexée par le temps : le poids d'une valeur
// est divisé par deux tous les `halfLifeDays` jours. Les trous dans les données sont donc
// pris en compte sans traitement particulier.

const HOURS_PER_DAY = 24;

export type DecayedMean = {
  readonly weightedSum: number;
  readonly weight: number;
  /** Nombre de valeurs reçues, sans pondération. */
  readonly count: number;
  /** Heure (depuis l'époque Unix) de la dernière valeur reçue. */
  readonly lastHour: number;
};

export const EMPTY_DECAYED_MEAN: DecayedMean = { weightedSum: 0, weight: 0, count: 0, lastHour: 0 };

export function updateDecayedMean(
  state: DecayedMean,
  value: number,
  hour: number,
  halfLifeDays: number,
): DecayedMean {
  if (!Number.isFinite(value)) return state;
  // Une valeur arrivée dans le désordre est traitée comme contemporaine de la dernière.
  const elapsedHours = state.count === 0 ? 0 : Math.max(0, hour - state.lastHour);
  const decay = Math.exp((-Math.LN2 * elapsedHours) / (halfLifeDays * HOURS_PER_DAY));
  return {
    weightedSum: state.weightedSum * decay + value,
    weight: state.weight * decay + 1,
    count: state.count + 1,
    lastHour: Math.max(hour, state.lastHour),
  };
}

/** Moyenne courante, ou `null` tant que l'historique compte moins de `minSamples` valeurs. */
export function readDecayedMean(state: DecayedMean, minSamples: number): number | null {
  if (state.count < minSamples || state.weight === 0) return null;
  return state.weightedSum / state.weight;
}
