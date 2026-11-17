// Mesures de qualité d'une série de prévisions face aux observations.

export type Score = {
  /** Erreur absolue moyenne. */
  readonly mae: number;
  /** Erreur moyenne signée (prévision − observation). */
  readonly bias: number;
  readonly count: number;
};

/**
 * Positions notées : celles de l'intervalle `[from, to[` où l'observation et toutes les
 * séries comparées existent. Toutes les méthodes sont ainsi jugées sur les mêmes heures.
 */
export function commonPositions(
  series: readonly Float64Array[],
  observation: Float64Array,
  from: number,
  to: number,
): number[] {
  const positions: number[] = [];
  for (let position = Math.max(from, 0); position < Math.min(to, observation.length); position += 1) {
    if (!Number.isFinite(observation[position])) continue;
    if (series.every((values) => Number.isFinite(values[position]))) positions.push(position);
  }
  return positions;
}

export function scoreSeries(forecast: Float64Array, observation: Float64Array, positions: readonly number[]): Score {
  let absolute = 0;
  let signed = 0;
  for (const position of positions) {
    const error = (forecast[position] ?? Number.NaN) - (observation[position] ?? Number.NaN);
    absolute += Math.abs(error);
    signed += error;
  }
  const count = positions.length;
  return count === 0
    ? { mae: Number.NaN, bias: Number.NaN, count }
    : { mae: absolute / count, bias: signed / count, count };
}
