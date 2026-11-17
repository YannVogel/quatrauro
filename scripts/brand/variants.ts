// Variantes de l'icône proposées à Yann (M0-11) et ce que l'export en tire. Aucune n'est
// retenue tant que Yann n'a pas choisi : rien ici n'est branché dans app.config.ts.

export const ICON_VARIANTS = ['compass', 'pinwheel', 'sunrise'] as const;

export type IconVariant = (typeof ICON_VARIANTS)[number];

export function isIconVariant(value: string | undefined): value is IconVariant {
  return ICON_VARIANTS.some((variant) => variant === value);
}

export type ExportStep = {
  /** Source SVG, depuis la racine du repo. */
  readonly source: string;
  /** PNG produit, depuis la racine du repo : les chemins que lit app.config.ts. */
  readonly target: string;
  /** Côté du PNG, en pixels. */
  readonly size: number;
};

const ICON_SIZE = 1024;

/** PNG à produire pour une variante. */
export function exportPlan(variant: IconVariant): ExportStep[] {
  const source = (name: string): string => `assets/icon/${variant}/${name}.svg`;
  return [
    { source: source('icon'), target: 'assets/icon.png', size: ICON_SIZE },
    { source: source('foreground'), target: 'assets/android-icon-foreground.png', size: ICON_SIZE },
    { source: source('monochrome'), target: 'assets/android-icon-monochrome.png', size: ICON_SIZE },
    { source: source('foreground'), target: 'assets/splash-icon.png', size: ICON_SIZE },
  ];
}
