// Pondération des modèles (ADR 0003, étape 2) : chaque modèle pèse en raison inverse de son
// erreur absolue moyenne récente, élevée à un exposant.

export type WeightOptions = {
  /** 0 donne des poids égaux ; plus l'exposant est grand, plus le meilleur modèle domine. */
  readonly exponent: number;
  /** Erreur plancher, pour qu'un modèle presque parfait sur une courte période n'écrase pas les autres. */
  readonly errorFloor: number;
};

/**
 * Poids normalisés (somme 1) des modèles disponibles. `errors[i]` est l'erreur récente du
 * modèle `i`, ou `null` s'il n'a pas assez d'historique : il reçoit alors un poids neutre,
 * égal à la moyenne des poids des modèles notés.
 */
export function computeWeights(errors: readonly (number | null)[], options: WeightOptions): number[] {
  if (errors.length === 0) return [];
  const raw = errors.map((error) =>
    error === null ? null : (1 / Math.max(error, options.errorFloor)) ** options.exponent,
  );
  const rated = raw.filter((weight): weight is number => weight !== null);
  const neutral = rated.length === 0 ? 1 : rated.reduce((sum, weight) => sum + weight, 0) / rated.length;
  const filled = raw.map((weight) => weight ?? neutral);
  const total = filled.reduce((sum, weight) => sum + weight, 0);
  return filled.map((weight) => weight / total);
}
