// Ce que l'export tire des sources SVG de l'icône (docs/design/icone.md).

export type ExportStep = {
  /** Source SVG, depuis la racine du repo. */
  readonly source: string;
  /** PNG produit, depuis la racine du repo : les chemins que lit app.config.ts. */
  readonly target: string;
  /** Côté du PNG, en pixels. */
  readonly size: number;
};

const ICON_SIZE = 1024;

const source = (name: string): string => `assets/icon/${name}.svg`;

/** PNG à produire depuis les sources de l'icône. */
export const EXPORT_PLAN: readonly ExportStep[] = [
  { source: source('icon'), target: 'assets/icon.png', size: ICON_SIZE },
  { source: source('foreground'), target: 'assets/android-icon-foreground.png', size: ICON_SIZE },
  { source: source('monochrome'), target: 'assets/android-icon-monochrome.png', size: ICON_SIZE },
  { source: source('foreground'), target: 'assets/splash-icon.png', size: ICON_SIZE },
];
