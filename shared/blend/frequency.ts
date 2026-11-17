// Fréquence observée d'un événement (il a plu, la prévision a été tenue…), lissée par un a priori
// tant que les cas sont peu nombreux.

export type Frequency = { readonly hits: number; readonly total: number };

export const EMPTY_FREQUENCY: Frequency = { hits: 0, total: 0 };

export function addOutcome(frequency: Frequency, hit: boolean): Frequency {
  return { hits: frequency.hits + (hit ? 1 : 0), total: frequency.total + 1 };
}

/**
 * Taux lissé : avec peu de cas il reste proche de `prior`, avec beaucoup il rejoint le taux
 * observé. `priorStrength` est le nombre de cas fictifs que vaut l'a priori.
 */
export function smoothedRate(frequency: Frequency, prior: number, priorStrength: number): number {
  return (frequency.hits + priorStrength * prior) / (frequency.total + priorStrength);
}
