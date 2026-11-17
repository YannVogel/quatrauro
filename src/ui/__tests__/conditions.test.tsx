import { render, screen } from '@testing-library/react-native';

import { strings } from '@/i18n';
import { CONDITIONS } from '@shared/conditions';

import { Icon } from '../Icon';
import { ThemeProvider } from '../ThemeProvider';
import { conditionAppearance } from '../conditions';
import { WCAG_AA, contrastRatio, parseColor } from '../contrast';
import { icons } from '../icons';
import { CONTRAST_PAIRS, HERO_TOKENS, colors } from '../theme';
import type { ThemeName } from '../theme';

const THEMES: readonly ThemeName[] = ['light', 'dark'];
const cases = CONDITIONS.flatMap((condition) =>
  [false, true].map((isNight) => ({ condition, isNight, moment: isNight ? 'la nuit' : 'le jour' })),
);

describe('conditions météo', () => {
  it('forment une liste sans doublon', () => {
    expect(new Set(CONDITIONS).size).toBe(CONDITIONS.length);
  });

  it.each(CONDITIONS)('« %s » a un nom en français', (condition) => {
    expect(strings.conditions[condition].length).toBeGreaterThan(0);
  });

  it.each(cases)(
    '« $condition » a une icône et ses couleurs, $moment',
    ({ condition, isNight }) => {
      const appearance = conditionAppearance(condition, isNight);
      expect(icons[appearance.icon]).toBeDefined();
      expect(HERO_TOKENS).toContain(appearance.hero);
      for (const theme of THEMES) {
        expect(() => parseColor(colors[theme][appearance.hero])).not.toThrow();
        expect(() => parseColor(colors[theme][appearance.badge])).not.toThrow();
      }
    },
  );

  it('ne montre le rond jaune que lorsque le soleil est visible', () => {
    const sunny = cases.filter(
      (entry) => conditionAppearance(entry.condition, entry.isNight).badge === 'sun',
    );
    expect(sunny.map((entry) => `${entry.condition} ${entry.moment}`)).toEqual([
      'clear le jour',
      'partlyCloudy le jour',
    ]);
  });

  it('distingue le jour de la nuit par ciel dégagé', () => {
    expect(conditionAppearance('clear', false).icon).toBe('sun');
    expect(conditionAppearance('clear', true).icon).toBe('moon');
    expect(conditionAppearance('clear', true).hero).toBe('heroNight');
  });
});

describe('couleurs du bloc d’état', () => {
  it.each(THEMES.flatMap((theme) => HERO_TOKENS.map((hero) => ({ theme, hero }))))(
    'le texte blanc reste lisible sur $hero, thème $theme',
    ({ theme, hero }) => {
      const ratio = contrastRatio(
        parseColor(colors[theme].onHero),
        parseColor(colors[theme][hero]),
      );
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA.normalText);
    },
  );

  it('sont toutes dans la liste des contrastes vérifiés, voile compris', () => {
    for (const hero of HERO_TOKENS) {
      expect(CONTRAST_PAIRS).toContainEqual({ text: 'onHero', background: hero });
      expect(CONTRAST_PAIRS).toContainEqual({
        text: 'onHero',
        background: 'heroOverlay',
        over: hero,
      });
    }
  });

  it('se distinguent du fond de l’écran dans les deux thèmes', () => {
    for (const theme of THEMES) {
      for (const hero of HERO_TOKENS) {
        expect(colors[theme][hero]).not.toBe(colors[theme].background);
      }
    }
  });
});

describe('Icon', () => {
  it('se lit par son libellé quand elle porte une information', async () => {
    await render(
      <ThemeProvider preference="light">
        <Icon name="rain" accessibilityLabel={strings.conditions.rain} />
      </ThemeProvider>,
    );
    expect(screen.getByRole('image', { name: strings.conditions.rain })).toBeOnTheScreen();
  });

  it('est ignorée des lecteurs d’écran quand elle est décorative', async () => {
    await render(
      <ThemeProvider preference="light">
        <Icon name="back" />
      </ThemeProvider>,
    );
    expect(screen.queryByRole('image')).toBeNull();
  });
});
