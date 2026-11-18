import { fireEvent, render, screen } from '@testing-library/react-native';
import * as ReactNative from 'react-native';

import { strings } from '@/i18n';
import { ThemeProvider } from '@/ui';
import { colors } from '@/ui/theme';
import { CONDITIONS } from '@shared/conditions';

import { CatalogScreen } from '../components/CatalogScreen';

const mockBack = jest.fn();
const mockRedirect = jest.fn((_props: { href: string }) => null);

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  Redirect: (props: { href: string }) => mockRedirect(props),
}));

function renderCatalog(systemScheme: 'light' | 'dark') {
  jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue(systemScheme);
  return render(
    <ThemeProvider>
      <CatalogScreen />
    </ThemeProvider>,
  );
}

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe('catalogue des composants', () => {
  it.each(['light', 'dark'] as const)('se rend sans erreur dans le thème %s', async (theme) => {
    await renderCatalog(theme);
    expect(screen.getByRole('header', { name: strings.catalog.title })).toBeOnTheScreen();
    expect(screen.getByText(theme)).toBeOnTheScreen();
    expect(screen.getByText(strings.catalog.title)).toHaveStyle({ color: colors[theme].text });
  });

  it('montre chaque condition, de jour et de nuit', async () => {
    await renderCatalog('light');
    for (const condition of CONDITIONS) {
      // Une fois par bloc de jour, une fois par bloc de nuit : le nom et le libellé de l'icône.
      expect(screen.getAllByText(strings.conditions[condition])).toHaveLength(2);
    }
    expect(screen.getAllByText(strings.catalog.day)).toHaveLength(CONDITIONS.length);
    expect(screen.getAllByText(strings.catalog.night)).toHaveLength(CONDITIONS.length);
  });

  it('montre chaque famille de composants', async () => {
    await renderCatalog('light');
    for (const title of Object.values(strings.catalog.sections)) {
      expect(screen.getByText(title)).toBeOnTheScreen();
    }
  });

  it.each(['light', 'dark'] as const)('montre chaque état non nominal, thème %s', async (theme) => {
    await renderCatalog(theme);
    const { states, freshness, models, reliability, catalog } = strings;
    for (const name of Object.values(catalog.states)) {
      expect(screen.getByText(name)).toBeOnTheScreen();
    }
    expect(screen.getByRole('progressbar', { name: states.loading })).toBeOnTheScreen();
    expect(screen.getByText(freshness.refreshing)).toBeOnTheScreen();
    expect(screen.getByText(freshness.staleTitle)).toBeOnTheScreen();
    expect(screen.getByText(freshness.staleDetail(freshness.hours(14)))).toBeOnTheScreen();
    expect(screen.getAllByText(states.refreshFailedTitle)).toHaveLength(2);
    expect(screen.getByText(states.emptyTitles.network)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: states.retry })).toBeOnTheScreen();
    expect(screen.getByText(states.emptyTitles.version)).toBeOnTheScreen();
    expect(screen.getByText(reliability.insufficientTitle)).toBeOnTheScreen();
    expect(screen.getByText(models.errorsNoneTitle)).toBeOnTheScreen();
    expect(screen.getByText(models.absent)).toBeOnTheScreen();
    expect(screen.getByText(models.outOfRange)).toBeOnTheScreen();
  });

  it('bascule de thème sans toucher au thème du système', async () => {
    await renderCatalog('light');
    const [toggle] = screen.getAllByRole('button', { name: strings.catalog.toggleTheme });
    expect(toggle).toBeDefined();
    if (toggle !== undefined) await fireEvent.press(toggle);
    expect(screen.getByText('dark')).toBeOnTheScreen();
    expect(screen.getByText(strings.catalog.title)).toHaveStyle({ color: colors.dark.text });
  });

  it('revient en arrière par son bouton de retour', async () => {
    await renderCatalog('light');
    await fireEvent.press(screen.getByRole('button', { name: strings.catalog.back }));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  describe("dans l'app distribuée", () => {
    // `__DEV__` vaut `false` dans une app distribuée.
    const setDevelopmentMode = (enabled: boolean) =>
      Object.assign(globalThis, { __DEV__: enabled });

    beforeEach(() => setDevelopmentMode(false));
    afterEach(() => setDevelopmentMode(true));

    it("renvoie à l'accueil au lieu de s'afficher", async () => {
      await renderCatalog('light');
      expect(mockRedirect).toHaveBeenCalledWith({ href: '/' });
      expect(screen.queryByText(strings.catalog.title)).toBeNull();
    });
  });
});
