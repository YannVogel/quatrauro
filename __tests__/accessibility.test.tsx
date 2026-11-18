// Accessibilité de l'app assemblée, écran par écran : noms des éléments interactifs et des
// graphiques, cibles tactiles, titres, lectures en double, grandes polices.
// Fiche : docs/design/accessibilite.md.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { StyleSheet } from 'react-native';
import { cleanup, fireEvent, waitFor } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';

import { strings } from '@/i18n';
import { queryClient } from '@/lib/queryClient';
import { allPublished, offline, servePublished } from '@/lib/testing/published';
import { setFontScale } from '@/ui/testing/fontScale';
import { sizes } from '@/ui/theme';

/** Mercredi matin, 9 h 30 à Paris. */
const NOW = '2026-11-18T08:30:00Z';
const NBSP = ' ';

type Node = NonNullable<typeof screen.root>;

const SCREENS = [
  { name: 'accueil', url: '/', ready: strings.home.links.about, title: null },
  {
    name: 'détail d’un jour',
    url: '/day/2026-11-19',
    ready: strings.day.hourly,
    title: 'Jeudi 19 novembre',
  },
  {
    name: '« Les modèles »',
    url: '/models',
    ready: strings.models.listTitle,
    title: strings.models.title,
  },
  {
    name: '« Fiabilité »',
    url: '/reliability',
    ready: strings.reliability.daysTitle,
    title: strings.reliability.title,
  },
  {
    name: '« À propos des données »',
    url: '/about',
    ready: strings.about.limitsTitle,
    title: strings.about.title,
  },
] as const;

afterEach(async () => {
  await setFontScale(1);
  await cleanup();
  queryClient.clear();
  await AsyncStorage.clear();
});

async function open(url: string, ready: string): Promise<void> {
  servePublished(allPublished);
  jest.useFakeTimers({ now: new Date(NOW) });
  await renderRouter('./app', { initialUrl: url });
  await waitFor(() => expect(screen.getByText(ready)).toBeOnTheScreen());
  // Les chiffres de la prévision sont arrivés.
  if (url !== '/about')
    await waitFor(() => expect(screen.getAllByText(/°/).length).toBeGreaterThan(0));
}

const isHidden = (node: Node): boolean =>
  node.props.accessibilityElementsHidden === true ||
  node.props.importantForAccessibility === 'no-hide-descendants' ||
  node.props['aria-hidden'] === true;

const spokenLabel = (node: Node): string | null => {
  const label: unknown = node.props.accessibilityLabel;
  return node.props.accessible === true && typeof label === 'string' && label !== '' ? label : null;
};

/** Éléments nommés placés dans un élément déjà nommé : un lecteur d'écran lirait deux fois. */
function readTwice(root: Node): string[] {
  const found: string[] = [];
  const visit = (node: Node, speaker: string | null): void => {
    if (isHidden(node)) return;
    const label = spokenLabel(node);
    if (label !== null && speaker !== null) found.push(`« ${label} » dans « ${speaker} »`);
    for (const child of node.children) {
      if (typeof child !== 'string') visit(child, speaker ?? label);
    }
  };
  visit(root, null);
  return found;
}

const interactive = (): Node[] =>
  (['button', 'link', 'radio'] as const).flatMap((role) => screen.queryAllByRole(role));

const heightOf = (node: Node): number => {
  const style = StyleSheet.flatten(node.props.style) ?? {};
  // Le voile d'un menu couvre tout l'écran : sa hauteur ne se lit pas dans son style.
  if (style.position === 'absolute' && style.top === 0 && style.bottom === 0) return Infinity;
  return Math.max(Number(style.minHeight ?? 0), Number(style.height ?? 0));
};

const rootOf = (): Node => {
  if (screen.root === null) throw new Error('rien n’est rendu');
  return screen.root;
};

describe.each(SCREENS)('accessibilité : $name', ({ url, ready, title }) => {
  beforeEach(() => open(url, ready));

  it('nomme chaque bouton, lien, choix et graphique', () => {
    const named = [...interactive(), ...screen.queryAllByRole('image')];
    expect(named.length).toBeGreaterThan(0);
    for (const element of named) expect(element).toHaveAccessibleName();
  });

  it('donne à chaque élément interactif une cible d’au moins 48 dp', () => {
    for (const element of interactive()) {
      expect(heightOf(element)).toBeGreaterThanOrEqual(sizes.touchTarget);
    }
  });

  it('ne fait rien lire deux fois', () => {
    expect(readTwice(rootOf())).toEqual([]);
  });

  it('a un titre, que les lecteurs d’écran reconnaissent', () => {
    // L'accueil n'a pas d'en-tête : son titre est le temps qu'il fait, dans le bloc d'état.
    const name = title ?? strings.conditions.clear;
    expect(screen.getByRole('header', { name })).toBeOnTheScreen();
  });

  it('garde tous ses éléments interactifs avec une police à 200 %', async () => {
    const before = interactive().map((element) => element.props.accessibilityLabel as unknown);
    await setFontScale(2);
    expect(interactive().map((element) => element.props.accessibilityLabel as unknown)).toEqual(
      before,
    );
    expect(readTwice(rootOf())).toEqual([]);
  });
});

describe('accessibilité : menu du thème', () => {
  it('nomme ses trois choix et dit lequel est en cours', async () => {
    await open('/', strings.home.links.about);
    await fireEvent.press(screen.getByRole('button', { name: strings.theme.open }));
    await waitFor(() => expect(screen.getAllByRole('radio').length).toBeGreaterThanOrEqual(3));

    const { options, systemHint } = strings.theme;
    expect(screen.getByRole('radio', { name: `${options.system}, ${systemHint}` })).toBeChecked();
    expect(screen.getByRole('radio', { name: options.light })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: options.dark })).not.toBeChecked();
    for (const element of interactive()) {
      expect(heightOf(element)).toBeGreaterThanOrEqual(sizes.touchTarget);
    }
    expect(readTwice(rootOf())).toEqual([]);
  });
});

describe('accessibilité : sans prévision', () => {
  it('l’état vide a un titre et un bouton nommé, de 48 dp au moins', async () => {
    jest.useFakeTimers({ now: new Date(NOW) });
    offline();
    await renderRouter('./app');
    await waitFor(() => screen.getByTestId('empty-state'), { timeout: 5000 });

    expect(
      screen.getByRole('header', { name: strings.states.emptyTitles.network }),
    ).toBeOnTheScreen();
    const retry = screen.getByRole('button', { name: strings.states.retry });
    expect(heightOf(retry)).toBeGreaterThanOrEqual(sizes.touchTarget);
    expect(readTwice(rootOf())).toEqual([]);
  });
});

describe('grandes polices : ce qui change de mise en page', () => {
  it('« Fiabilité » écrit chaque jour sur ses propres lignes, avec ses intitulés', async () => {
    await setFontScale(2);
    await open('/reliability', strings.reliability.daysTitle);
    const { forecast, observed, gap, labelled } = strings.reliability;
    expect(screen.getByText(labelled(forecast, '16,2°'))).toBeOnTheScreen();
    expect(screen.getByText(labelled(observed, '16,7°'))).toBeOnTheScreen();
    expect(screen.getAllByText(labelled(gap, '0,5°')).length).toBeGreaterThan(0);
    // Ce que lit un lecteur d'écran ne change pas.
    expect(
      screen.getByLabelText(
        'dimanche 15, prévu 16,2 degrés, observé 16,7 degrés, écart 0,5 degrés',
      ),
    ).toBeOnTheScreen();
  });

  it('l’accueil écrit la fiabilité de chaque jour sous sa ligne', async () => {
    await setFontScale(2);
    await open('/', strings.home.links.about);
    expect(screen.getByText(`fiabilité 51${NBSP}%`)).toBeOnTheScreen();
  });

  it('à 130 %, rien ne change de mise en page', async () => {
    await setFontScale(1.3);
    await open('/reliability', strings.reliability.daysTitle);
    expect(screen.getByText('16,2°')).toBeOnTheScreen();
    expect(screen.queryByText(/^Prévu 16,2°$/)).toBeNull();
  });
});
