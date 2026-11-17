// Tokens de la direction Riviera (docs/design/riviera.md). C'est le seul fichier où une couleur
// peut être écrite en dur : partout ailleurs, on lit le thème. Ce fichier n'importe rien, pour
// rester lisible depuis `app.config.ts` comme depuis l'app.

export type ThemeName = 'light' | 'dark';

const lightColors = {
  /** Fond des écrans. */
  background: '#EAF4FF',
  /** Cartes, vignettes, boutons ronds hors bloc. */
  card: '#FFFFFF',
  /** Texte principal. */
  text: '#0B1B3A',
  /** Texte secondaire, légendes. */
  textMuted: '#4A5B7C',
  /** Fond des barres, séparateurs. */
  track: '#DCE8F7',
  /** Remplissage des barres. */
  bar: '#1463FF',
  /** Bloc d'état par beau temps, et bloc des écrans « Les modèles » et « Fiabilité ». */
  heroClear: '#1463FF',
  /** Bloc d'état sous la pluie. */
  heroRain: '#3A4F7A',
  /** Texte sur le bloc d'état. */
  onHero: '#FFFFFF',
  /** Rond du soleil, pastille mise en avant. */
  sun: '#FFC93C',
  /** Texte et icône sur le jaune ou sur le rond pâle. */
  onSun: '#0B1B3A',
  /** Rond d'icône quand il n'y a pas de soleil. */
  pale: '#DCE8F7',
  /** Fond du sélecteur de ville et du bouton de thème dans le bloc d'état. */
  heroOverlay: 'rgba(0, 0, 0, 0.16)',
};

export type ColorToken = keyof typeof lightColors;
export type Colors = Readonly<Record<ColorToken, string>>;

const darkColors: Colors = {
  background: '#071226',
  card: '#0F1E3D',
  text: '#EAF1FF',
  textMuted: '#A9B8D6',
  track: '#1C2E55',
  bar: '#7FB0FF',
  heroClear: '#1A4FD6',
  heroRain: '#2A3A5E',
  onHero: '#FFFFFF',
  sun: '#FFC93C',
  onSun: '#0B1B3A',
  pale: '#DCE8F7',
  heroOverlay: 'rgba(255, 255, 255, 0.16)',
};

export const colors: Readonly<Record<ThemeName, Colors>> = { light: lightColors, dark: darkColors };

export const FONT_FAMILY = 'Outfit';

/** Interlettrage des grands chiffres : −4 % du corps. */
const DISPLAY_TRACKING = -0.04;

type FontWeight = '400' | '500' | '600' | '700';

export type TextStyleToken = {
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly fontWeight: FontWeight;
  readonly lineHeight: number;
  readonly letterSpacing?: number;
};

function textStyle(
  fontSize: number,
  fontWeight: FontWeight,
  lineHeightRatio: number,
): TextStyleToken {
  return {
    fontFamily: FONT_FAMILY,
    fontSize,
    fontWeight,
    lineHeight: Math.round(fontSize * lineHeightRatio),
  };
}

function displayStyle(fontSize: number): TextStyleToken {
  return { ...textStyle(fontSize, '700', 1), letterSpacing: fontSize * DISPLAY_TRACKING };
}

export const typography = {
  /** Température de l'accueil. */
  displayXL: displayStyle(108),
  /** Chiffre principal des autres écrans. */
  displayL: displayStyle(80),
  /** Condition sous la température. */
  title: textStyle(22, '600', 1.25),
  /** Valeur d'un modèle. */
  value: textStyle(24, '600', 1.25),
  /** Titre d'écran. */
  heading: textStyle(18, '600', 1.3),
  /** Titre de carte. */
  section: textStyle(16, '600', 1.3),
  /** Valeur d'une vignette. */
  stat: textStyle(20, '600', 1.25),
  /** Lignes de liste, texte courant. */
  body: textStyle(15, '400', 1.4),
  /** Texte courant mis en avant. */
  bodyStrong: textStyle(15, '600', 1.4),
  /** Pastilles. */
  label: textStyle(14, '600', 1.3),
  /** Légendes, texte secondaire. */
  caption: textStyle(13, '400', 1.35),
  /** Graduations : la taille minimale. */
  micro: textStyle(12, '400', 1.3),
} as const satisfies Record<string, TextStyleToken>;

export type TextVariant = keyof typeof typography;

export const spacing = {
  /** Marge d'écran. */
  screen: 16,
  /** Espace entre blocs. */
  block: 12,
  /** Marge intérieure du bloc d'état et des cartes. */
  card: 20,
  /** Espace entre éléments voisins. */
  item: 8,
} as const;

export const radii = {
  /** Bloc d'état et cartes. */
  card: 28,
  /** Vignettes. */
  tile: 18,
  /** Pastilles. */
  pill: 16,
  /** Boutons ronds et sélecteur : la moitié de la cible tactile. */
  control: 24,
} as const;

export const sizes = {
  /** Cible tactile minimale (AGENTS.md). */
  touchTarget: 48,
  /** Épaisseur des barres. */
  bar: 8,
  /** Rond du soleil à l'accueil. */
  sunLarge: 112,
  /** Rond du soleil sur le détail d'un jour. */
  sunMedium: 92,
} as const;

export type Theme = {
  readonly name: ThemeName;
  readonly colors: Colors;
  readonly typography: typeof typography;
  readonly spacing: typeof spacing;
  readonly radii: typeof radii;
  readonly sizes: typeof sizes;
};

function createTheme(name: ThemeName): Theme {
  return { name, colors: colors[name], typography, spacing, radii, sizes };
}

export const themes: Readonly<Record<ThemeName, Theme>> = {
  light: createTheme('light'),
  dark: createTheme('dark'),
};

/**
 * Couples texte / fond de la spécification, vérifiés par un test (WCAG AA). `over` désigne le
 * fond sur lequel repose un fond translucide ; `large` vaut pour un texte d'au moins 24 px.
 */
export type ContrastPair = {
  readonly text: ColorToken;
  readonly background: ColorToken;
  readonly over?: ColorToken;
  readonly large?: boolean;
};

export const CONTRAST_PAIRS: readonly ContrastPair[] = [
  { text: 'text', background: 'background' },
  { text: 'text', background: 'card' },
  { text: 'textMuted', background: 'background' },
  { text: 'textMuted', background: 'card' },
  { text: 'onHero', background: 'heroClear' },
  { text: 'onHero', background: 'heroRain' },
  { text: 'onHero', background: 'heroOverlay', over: 'heroClear' },
  { text: 'onHero', background: 'heroOverlay', over: 'heroRain' },
  { text: 'onSun', background: 'sun' },
  { text: 'onSun', background: 'pale' },
];
