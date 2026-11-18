import { WCAG_AA, composite, contrastRatio, parseColor } from '../contrast';
import { CONTRAST_PAIRS, GRAPHIC_PAIRS, colors, typography } from '../theme';
import type { ThemeName } from '../theme';

const THEMES: readonly ThemeName[] = ['light', 'dark'];

describe('tokens de couleur', () => {
  it('ont exactement les mêmes clés en clair et en sombre', () => {
    expect(Object.keys(colors.dark).sort()).toEqual(Object.keys(colors.light).sort());
  });

  it('sont toutes des couleurs lisibles', () => {
    for (const theme of THEMES) {
      for (const color of Object.values(colors[theme]))
        expect(() => parseColor(color)).not.toThrow();
    }
  });

  describe.each(THEMES)('thème %s', (theme) => {
    it.each(CONTRAST_PAIRS)(
      '$text sur $background respecte WCAG AA',
      ({ text, background, over, large }) => {
        const palette = colors[theme];
        const surface =
          over === undefined
            ? parseColor(palette[background])
            : composite(palette[background], palette[over]);
        const ratio = contrastRatio(parseColor(palette[text]), surface);
        expect(ratio).toBeGreaterThanOrEqual(large ? WCAG_AA.largeText : WCAG_AA.normalText);
      },
    );

    it.each(GRAPHIC_PAIRS)(
      'la forme $shape se détache du fond $background (3:1)',
      ({ shape, background }) => {
        const palette = colors[theme];
        const ratio = contrastRatio(parseColor(palette[shape]), parseColor(palette[background]));
        expect(ratio).toBeGreaterThanOrEqual(WCAG_AA.graphics);
      },
    );
  });
});

describe('typographie', () => {
  it('ne descend jamais sous 12 px', () => {
    for (const style of Object.values(typography))
      expect(style.fontSize).toBeGreaterThanOrEqual(12);
  });

  it('resserre les grands chiffres de 4 %', () => {
    expect(typography.displayXL.letterSpacing).toBeCloseTo(-4.32);
    expect(typography.displayL.letterSpacing).toBeCloseTo(-3.2);
  });
});

describe('calcul de contraste', () => {
  it('donne 21 pour du noir sur du blanc et 1 pour deux couleurs identiques', () => {
    const black = parseColor('#000000');
    const white = parseColor('#FFFFFF');
    expect(contrastRatio(black, white)).toBeCloseTo(21);
    expect(contrastRatio(white, black)).toBeCloseTo(21);
    expect(contrastRatio(white, white)).toBe(1);
  });

  it('pose une couleur translucide sur son fond', () => {
    expect(composite('rgba(255, 255, 255, 0.5)', '#000000')).toEqual({
      r: 127.5,
      g: 127.5,
      b: 127.5,
      a: 1,
    });
    expect(composite('#102030', '#FFFFFF')).toEqual({ r: 16, g: 32, b: 48, a: 1 });
  });

  it('refuse une couleur illisible ou un fond translucide', () => {
    expect(() => parseColor('bleu')).toThrow();
    expect(() => composite('#FFFFFF', 'rgba(0, 0, 0, 0.5)')).toThrow();
  });
});
