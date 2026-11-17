// Régression isotonique (algorithme des violateurs adjacents) : rend la suite monotone la plus
// proche des valeurs données. Sert à garantir qu'une probabilité de pluie ne baisse pas quand
// davantage de modèles annoncent la pluie, et qu'un indice de fiabilité ne monte pas quand les
// modèles divergent davantage.

export type Direction = 'increasing' | 'decreasing';

export function isotonic(values: readonly number[], weights: readonly number[], direction: Direction): number[] {
  if (values.length !== weights.length) throw new Error('Autant de poids que de valeurs sont attendus');
  const sign = direction === 'increasing' ? 1 : -1;
  // Chaque bloc regroupe des valeurs voisines fusionnées en leur moyenne pondérée.
  const blocks: { mean: number; weight: number; size: number }[] = [];
  values.forEach((value, index) => {
    blocks.push({ mean: sign * value, weight: weights[index] ?? 0, size: 1 });
    while (blocks.length >= 2) {
      const last = blocks[blocks.length - 1];
      const previous = blocks[blocks.length - 2];
      if (last === undefined || previous === undefined || previous.mean <= last.mean) break;
      const weight = previous.weight + last.weight;
      const mean = weight === 0 ? (previous.mean + last.mean) / 2 : (previous.mean * previous.weight + last.mean * last.weight) / weight;
      blocks.splice(blocks.length - 2, 2, { mean, weight, size: previous.size + last.size });
    }
  });
  return blocks.flatMap((block) => Array.from({ length: block.size }, () => sign * block.mean));
}
