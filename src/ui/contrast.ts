// Contraste entre deux couleurs selon WCAG 2.x, pour vérifier les tokens par des tests.

type Rgba = { readonly r: number; readonly g: number; readonly b: number; readonly a: number };

const HEX_FORMAT = /^#([0-9a-f]{6})$/i;
const RGBA_FORMAT = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/;

export const WCAG_AA = { normalText: 4.5, largeText: 3 } as const;

export function parseColor(color: string): Rgba {
  const hex = HEX_FORMAT.exec(color);
  if (hex?.[1] !== undefined) {
    const value = Number.parseInt(hex[1], 16);
    return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255, a: 1 };
  }
  const rgba = RGBA_FORMAT.exec(color);
  if (rgba !== null) {
    return { r: Number(rgba[1]), g: Number(rgba[2]), b: Number(rgba[3]), a: Number(rgba[4]) };
  }
  throw new Error(`Couleur illisible : ${color}`);
}

/** Couleur opaque obtenue en posant `foreground` (éventuellement translucide) sur `background`. */
export function composite(foreground: string, background: string): Rgba {
  const top = parseColor(foreground);
  const bottom = parseColor(background);
  if (bottom.a !== 1) throw new Error(`Le fond doit être opaque : ${background}`);
  const mix = (above: number, below: number): number => above * top.a + below * (1 - top.a);
  return { r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b), a: 1 };
}

function relativeLuminance({ r, g, b }: Rgba): number {
  const linear = (channel: number): number => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** Rapport de contraste, de 1 (identiques) à 21 (noir sur blanc). Les deux couleurs sont opaques. */
export function contrastRatio(first: Rgba, second: Rgba): number {
  const [lighter, darker] = [relativeLuminance(first), relativeLuminance(second)].sort(
    (a, b) => b - a,
  );
  return ((lighter ?? 0) + 0.05) / ((darker ?? 0) + 0.05);
}
