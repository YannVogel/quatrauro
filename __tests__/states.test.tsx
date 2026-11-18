// Les états non nominaux, écran par écran : chargement, rafraîchissement, prévision ancienne,
// erreur avec ou sans cache. Fiche : docs/design/etats.md.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { RefreshControl } from 'react-native';
import { act, cleanup, fireEvent, waitFor, within } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';

import { strings } from '@/i18n';
import { queryClient } from '@/lib/queryClient';
import { allPublished, offline, servePublished } from '@/lib/testing/published';
import type { Reply } from '@/lib/testing/published';

const { home, freshness, states, conditions, reliability } = strings;
/** Mercredi matin, 9 h 30 à Paris : la prévision a onze heures. */
const FRESH = '2026-11-18T08:30:00Z';
/** Mercredi midi : elle en a treize, elle est « ancienne ». */
const STALE = '2026-11-18T11:00:00Z';

afterEach(async () => {
  await cleanup();
  queryClient.clear();
  await AsyncStorage.clear();
});

async function openAt(
  instant: string,
  files: Readonly<Record<string, Reply>> = allPublished,
  initialUrl = '/',
): Promise<void> {
  servePublished(files);
  jest.useFakeTimers({ now: new Date(instant) });
  await renderRouter('./app', { initialUrl });
}
const shown = (text: string) => waitFor(() => expect(screen.getByText(text)).toBeOnTheScreen());
const silentNetwork = (): void => {
  global.fetch = jest.fn(() => new Promise<Response>(() => undefined));
};
/**
 * Le geste « tirer pour rafraîchir ». Sous Jest, React Native remplace `RefreshControl` par un
 * composant vide qui garde la dernière instance montée : c'est par elle qu'on atteint le geste.
 */
type MountedRefreshControl = { readonly props: { readonly onRefresh: () => void } };
const pullToRefresh = () =>
  act(() => {
    const { latestRef } = RefreshControl as unknown as { latestRef: MountedRefreshControl };
    latestRef.props.onRefresh();
  });
const fails = (failure: Reply): Readonly<Record<string, Reply>> =>
  Object.fromEntries(Object.keys(allPublished).map((file) => [file, failure]));

describe('premier chargement', () => {
  it.each([
    ['l’accueil', '/', states.loading],
    ['le détail d’un jour', '/day/2026-11-19', states.loading],
    ['« Les modèles »', '/models', states.loading],
    ['« Fiabilité »', '/reliability', reliability.loading],
  ])('%s montre des formes à la place du contenu, et le dit', async (_screen, url, label) => {
    silentNetwork();
    jest.useFakeTimers({ now: new Date(FRESH) });
    await renderRouter('./app', { initialUrl: url });

    const skeleton = await waitFor(() => screen.getByRole('progressbar', { name: label }));
    expect(skeleton).toBeBusy();
    // Des formes, jamais des valeurs : ni degré, ni pourcentage, ni tiret.
    expect(screen.queryByText(/°|%|—/)).toBeNull();
    expect(screen.queryByTestId('empty-state')).toBeNull();
  });

  it('laisse la place à la prévision dès qu’elle arrive', async () => {
    await openAt(FRESH);
    await shown(conditions.clear);
    expect(screen.queryByRole('progressbar')).toBeNull();
  });
});

describe('rafraîchissement', () => {
  it('garde la prévision affichée et dit que la mise à jour est en cours', async () => {
    await openAt(FRESH);
    await shown(conditions.clear);

    silentNetwork();
    await pullToRefresh();
    await shown(freshness.refreshing);
    expect(screen.getByText(conditions.clear)).toBeOnTheScreen();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });
});

describe('prévision ancienne', () => {
  it.each([
    ['l’accueil', '/'],
    ['le détail d’un jour', '/day/2026-11-19'],
    ['« Les modèles »', '/models'],
  ])('%s le signale par un bandeau, sans retirer la prévision', async (_screen, url) => {
    await openAt(STALE, allPublished, url);
    const notice = await waitFor(() => screen.getByTestId('stale-notice'));
    expect(notice).toHaveProp('accessibilityRole', 'alert');
    expect(within(notice).getByText(freshness.staleTitle)).toBeOnTheScreen();
    expect(within(notice).getByText(freshness.staleDetail(freshness.hours(13)))).toBeOnTheScreen();
    expect(screen.queryByTestId('empty-state')).toBeNull();
  });

  it('donne la raison quand la mise à jour vient d’échouer', async () => {
    await openAt(STALE);
    await waitFor(() => screen.getByTestId('stale-notice'));

    offline();
    await pullToRefresh();
    const reason = freshness.staleAfterFailure(freshness.hours(13), states.refreshFailed.network);
    await waitFor(() => expect(screen.getByText(reason)).toBeOnTheScreen(), { timeout: 5000 });
    // Un seul bandeau : l'âge et la raison y sont réunis.
    expect(screen.queryByTestId('refresh-failed-notice')).toBeNull();
  });
});

describe('erreur avec une prévision en cache', () => {
  it.each([
    ['network', { failure: 'Network request failed' }],
    ['http', { status: 503 }],
    ['invalid', { json: { schemaVersion: 1, city: 'toulon' } }],
    ['version', { json: { schemaVersion: 2 } }],
  ] as const)('%s : la prévision reste, un bandeau dit pourquoi', async (kind, failure) => {
    await openAt(FRESH);
    await shown(conditions.clear);

    servePublished(fails(failure));
    await pullToRefresh();
    const notice = await waitFor(() => screen.getByTestId('refresh-failed-notice'), {
      timeout: 5000,
    });
    expect(within(notice).getByText(states.refreshFailedTitle)).toBeOnTheScreen();
    expect(within(notice).getByText(states.refreshFailed[kind])).toBeOnTheScreen();
    expect(screen.getByText(conditions.clear)).toBeOnTheScreen();
    expect(screen.queryByTestId('empty-state')).toBeNull();
  });

  it('retire le bandeau quand la mise à jour finit par réussir', async () => {
    await openAt(FRESH);
    await shown(conditions.clear);
    offline();
    await pullToRefresh();
    await waitFor(() => screen.getByTestId('refresh-failed-notice'), { timeout: 5000 });

    servePublished(allPublished);
    await pullToRefresh();
    await waitFor(() => expect(screen.queryByTestId('refresh-failed-notice')).toBeNull());
  });
});

describe('erreur sans aucune prévision', () => {
  it.each([
    ['network', { failure: 'Network request failed' }],
    ['http', { status: 503 }],
    ['invalid', { json: { schemaVersion: 1, city: 'toulon' } }],
  ] as const)('%s : un titre, quoi faire, et un bouton pour réessayer', async (kind, failure) => {
    await openAt(FRESH, fails(failure));
    const message = await waitFor(() => screen.getByTestId('empty-state'), { timeout: 5000 });
    expect(within(message).getByRole('header', { name: states.emptyTitles[kind] })).toBeTruthy();
    expect(within(message).getByText(states.empty[kind])).toBeOnTheScreen();
    expect(within(message).getByRole('button', { name: states.retry })).toBeOnTheScreen();
    expect(screen.queryByText(/\d/)).toBeNull();
  });

  it('réessayer recharge la prévision, une fois le réseau revenu', async () => {
    jest.useFakeTimers({ now: new Date(FRESH) });
    offline();
    await renderRouter('./app');
    await waitFor(() => screen.getByTestId('empty-state'), { timeout: 5000 });

    servePublished(allPublished);
    await fireEvent.press(screen.getByRole('button', { name: states.retry }));
    await shown(conditions.clear);
    expect(screen.queryByTestId('empty-state')).toBeNull();
  });

  it.each([
    ['le détail d’un jour', '/day/2026-11-19'],
    ['« Les modèles »', '/models'],
  ])('%s dit la même chose que l’accueil', async (_screen, url) => {
    jest.useFakeTimers({ now: new Date(FRESH) });
    offline();
    await renderRouter('./app', { initialUrl: url });
    await waitFor(() => expect(screen.getByText(states.emptyTitles.network)).toBeOnTheScreen(), {
      timeout: 5000,
    });
    expect(screen.getByRole('button', { name: states.retry })).toBeOnTheScreen();
  });

  it('une prévision dont tous les jours sont passés n’est plus montrée', async () => {
    // Dix jours après le calcul : le cache n'a plus rien à dire, et le réseau redonne le même fichier.
    await openAt('2026-11-28T08:30:00Z');
    await shown(states.emptyTitles.expired);
    expect(screen.getByText(states.empty.expired)).toBeOnTheScreen();
    expect(screen.getByText(home.links.about)).toBeOnTheScreen();
  });
});
