// Direction du vent : une direction ne se moyenne pas en degrés (350° et 10° feraient 180°,
// soit plein sud au lieu de plein nord). On moyenne les vecteurs unitaires.

const FULL_TURN = 360;
/** En dessous de cette longueur, les directions s'annulent : il n'y a pas de direction moyenne. */
const MIN_RESULTANT = 1e-6;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
const toDegrees = (radians: number): number => (radians * 180) / Math.PI;

/**
 * Direction moyenne pondérée, en degrés de 0 (inclus) à 360 (exclu). `null` sans direction
 * à moyenner, ou quand elles s'annulent (deux modèles à poids égaux, l'un au nord, l'autre au sud).
 */
export function meanDirection(
  directions: readonly number[],
  weights: readonly number[],
): number | null {
  if (directions.length !== weights.length) {
    throw new Error('Autant de poids que de directions sont attendus');
  }
  let east = 0;
  let north = 0;
  directions.forEach((direction, index) => {
    const weight = weights[index] ?? 0;
    east += weight * Math.sin(toRadians(direction));
    north += weight * Math.cos(toRadians(direction));
  });
  if (Math.hypot(east, north) < MIN_RESULTANT) return null;
  const degrees = toDegrees(Math.atan2(east, north));
  // Les arrondis peuvent rendre −0,0000001 ou 360 pour un vent de nord.
  const normalized = ((degrees % FULL_TURN) + FULL_TURN) % FULL_TURN;
  return Math.abs(normalized - FULL_TURN) < MIN_RESULTANT ? 0 : normalized;
}
