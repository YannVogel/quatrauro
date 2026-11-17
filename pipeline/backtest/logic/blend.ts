// Mélange (ADR 0003, étape 3) : moyenne pondérée des valeurs corrigées des modèles disponibles.

export type Blend = {
  readonly value: number;
  /** Écart-type des valeurs des modèles autour de leur moyenne simple : la mesure de leur désaccord. */
  readonly spread: number;
};

/** `null` quand aucun modèle n'est disponible : on n'invente pas de valeur. */
export function blendValues(values: readonly number[], weights: readonly number[]): Blend | null {
  if (values.length === 0) return null;
  if (values.length !== weights.length)
    throw new Error('Autant de poids que de valeurs sont attendus');
  let value = 0;
  let mean = 0;
  values.forEach((current, index) => {
    value += current * (weights[index] ?? 0);
    mean += current / values.length;
  });
  const variance = values.reduce((sum, current) => sum + (current - mean) ** 2, 0) / values.length;
  return { value, spread: Math.sqrt(variance) };
}
