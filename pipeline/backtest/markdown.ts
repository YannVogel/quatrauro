// Mise en forme du rapport : nombres à la française et tableaux markdown.

const MISSING = '—';

/** Nombre avec virgule décimale ; une valeur absente s'écrit « — ». */
export function formatNumber(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return MISSING;
  const magnitude = Math.abs(value).toFixed(digits).replace('.', ',');
  // Une valeur négative qui s'arrondit à zéro s'écrit sans signe.
  const isNegative = value < 0 && Number(Math.abs(value).toFixed(digits)) !== 0;
  return `${isNegative ? '−' : ''}${magnitude}`;
}

/** Pourcentage à partir d'une proportion (0,12 → « 12 % »), avec une espace insécable. */
export function formatPercent(ratio: number, digits = 0): string {
  return Number.isFinite(ratio) ? `${formatNumber(ratio * 100, digits)} %` : MISSING;
}

/** Écart relatif signé (0,12 → « +12,0 % »). */
export function formatGain(ratio: number): string {
  if (!Number.isFinite(ratio)) return MISSING;
  const magnitude = formatNumber(Math.abs(ratio) * 100, 1);
  return `${ratio < 0 && magnitude !== formatNumber(0, 1) ? '−' : '+'}${magnitude} %`;
}

export function formatInteger(value: number): string {
  return Number.isFinite(value) ? String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : MISSING;
}

export function markdownTable(headers: readonly string[], rows: readonly (readonly string[])[]): string {
  const line = (cells: readonly string[]): string => `| ${cells.join(' | ')} |`;
  rows.forEach((row) => {
    if (row.length !== headers.length) throw new Error(`Ligne de ${row.length} cellules pour ${headers.length} colonnes`);
  });
  return [line(headers), line(headers.map(() => '---')), ...rows.map(line)].join('\n');
}
