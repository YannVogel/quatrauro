// Réglage du thème : Système, Clair ou Sombre, mémorisé et appliqué partout.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ReactNative from 'react-native';
import { cleanup, fireEvent, waitFor } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';

import { strings } from '@/i18n';
import { queryClient } from '@/lib/queryClient';
import { allPublished, servePublished } from '@/lib/testing/published';
import { themes } from '@/ui/theme';

const { theme, conditions } = strings;
const STORAGE_KEY = 'quatrauro-preference-theme';
/** Mercredi 9 h 30 à Paris : ciel dégagé à Toulon, le bloc d'état a la couleur `heroClear`. */
const NOW = '2026-11-18T08:30:00Z';

let systemScheme: 'light' | 'dark' = 'light';
let setColorScheme: jest.SpyInstance;

beforeEach(() => {
  systemScheme = 'light';
  jest.spyOn(ReactNative, 'useColorScheme').mockImplementation(() => systemScheme);
  setColorScheme = jest
    .spyOn(ReactNative.Appearance, 'setColorScheme')
    .mockImplementation(() => undefined);
});

afterEach(async () => {
  await cleanup();
  queryClient.clear();
  await AsyncStorage.clear();
  jest.restoreAllMocks();
});

async function open(): Promise<void> {
  servePublished(allPublished);
  jest.useFakeTimers({ now: new Date(NOW) });
  await renderRouter('./app');
  await waitFor(() => expect(screen.getByText(conditions.clear)).toBeOnTheScreen());
}
const heroColor = (): unknown =>
  ReactNative.StyleSheet.flatten(screen.getByTestId('home-hero').props.style).backgroundColor;
/** Ouvre le menu du thème et attend qu'il soit affiché. */
const openMenu = async (): Promise<void> => {
  await fireEvent.press(screen.getByRole('button', { name: theme.open }));
  await waitFor(() =>
    expect(screen.getByRole('radio', { name: theme.options.light })).toBeOnTheScreen(),
  );
};
const choose = async (label: string): Promise<void> => {
  await openMenu();
  await fireEvent.press(screen.getByRole('radio', { name: new RegExp(`^${label}`) }));
};

describe('thème « Système »', () => {
  it('est le réglage de départ, et suit le téléphone', async () => {
    await open();
    expect(heroColor()).toBe(themes.light.colors.heroClear);
    expect(setColorScheme).toHaveBeenLastCalledWith('auto');

    await openMenu();
    expect(
      screen.getByRole('radio', { name: `${theme.options.system}, ${theme.systemHint}` }),
    ).toBeChecked();
    expect(screen.getByRole('radio', { name: theme.options.light })).not.toBeChecked();
  });

  it('s’ouvre en sombre quand le téléphone est en sombre', async () => {
    systemScheme = 'dark';
    await open();
    expect(heroColor()).toBe(themes.dark.colors.heroClear);
  });
});

describe('thème choisi', () => {
  it('« Sombre » s’applique tout de suite, même si le téléphone est en clair', async () => {
    await open();
    await choose(theme.options.dark);

    expect(heroColor()).toBe(themes.dark.colors.heroClear);
    expect(setColorScheme).toHaveBeenLastCalledWith('dark');
    // Le menu s'est refermé.
    expect(screen.queryByRole('radio', { name: theme.options.dark })).toBeNull();
  });

  it('« Clair » tient même si le téléphone passe en sombre', async () => {
    systemScheme = 'dark';
    await open();
    await choose(theme.options.light);
    expect(heroColor()).toBe(themes.light.colors.heroClear);
    expect(setColorScheme).toHaveBeenLastCalledWith('light');
  });

  it('est enregistré sur l’appareil dès qu’il est choisi', async () => {
    await open();
    await choose(theme.options.dark);
    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe('dark');
  });

  it('est appliqué dès le premier affichage au lancement suivant', async () => {
    // L'app a été fermée avec « Sombre » enregistré ; le téléphone, lui, est en clair.
    await AsyncStorage.setItem(STORAGE_KEY, 'dark');
    await open();
    expect(heroColor()).toBe(themes.dark.colors.heroClear);
    expect(setColorScheme).toHaveBeenLastCalledWith('dark');
    expect(setColorScheme).not.toHaveBeenCalledWith('light');

    await openMenu();
    expect(screen.getByRole('radio', { name: theme.options.dark })).toBeChecked();
  });

  it('revient au téléphone quand on rechoisit « Système »', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'dark');
    await open();
    expect(heroColor()).toBe(themes.dark.colors.heroClear);

    await choose(theme.options.system);
    expect(heroColor()).toBe(themes.light.colors.heroClear);
    expect(setColorScheme).toHaveBeenLastCalledWith('auto');
    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe('system');
  });

  it('ignore un réglage enregistré qui n’existe pas', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'sepia');
    await open();
    expect(heroColor()).toBe(themes.light.colors.heroClear);
  });
});

describe('menu du thème', () => {
  it('se ferme sans rien changer quand on touche le voile', async () => {
    await open();
    await openMenu();
    await fireEvent.press(screen.getByRole('button', { name: theme.close }));
    expect(screen.queryByRole('radio', { name: theme.options.dark })).toBeNull();
    expect(heroColor()).toBe(themes.light.colors.heroClear);
    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('s’ouvre aussi depuis le détail d’un jour, avec le même réglage', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'dark');
    await open();
    await fireEvent.press(screen.getByText('Jeu.'));
    await openMenu();
    expect(screen.getByRole('radio', { name: theme.options.dark })).toBeChecked();
  });
});
