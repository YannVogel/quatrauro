import { act, cleanup, fireEvent, waitFor } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';

import { strings } from '@/i18n';
import { queryClient } from '@/lib/queryClient';
import { allPublished, offline, servePublished } from '@/lib/testing/published';

/**
 * Ferme l'app après un cas : on démonte l'écran, puis on vide le cache. Les fausses minuteries
 * que `renderRouter` installe restent en place : les retirer ici ferait programmer la purge du
 * cache (dans sept jours) sur la vraie horloge, et Jest attendrait au lieu de s'arrêter.
 */
async function closeApp(): Promise<void> {
  await cleanup();
  queryClient.clear();
}

describe("l'app", () => {
  // Le réseau n'est pas simulé ici : les chargements échouent.
  afterEach(closeApp);

  it("s'ouvre sur l'écran provisoire, qui affiche le nom de l'app", async () => {
    await renderRouter('./app');

    expect(screen).toHavePathname('/');
    expect(screen.getByRole('header', { name: strings.app.name })).toBeOnTheScreen();
    expect(screen.getByText(strings.home.placeholder)).toBeOnTheScreen();
  });

  it('ouvre le catalogue des composants depuis l’accueil, en développement', async () => {
    await renderRouter('./app');

    await fireEvent.press(screen.getByText(strings.home.openCatalog));

    expect(screen).toHavePathname('/dev/catalog');
    expect(screen.getByRole('header', { name: strings.catalog.title })).toBeOnTheScreen();
  });

  describe("dans l'app distribuée", () => {
    // `__DEV__` vaut `false` dans une app distribuée.
    const setDevelopmentMode = (enabled: boolean) =>
      Object.assign(globalThis, { __DEV__: enabled });

    beforeEach(() => setDevelopmentMode(false));
    afterEach(() => setDevelopmentMode(true));

    it('ne propose pas le catalogue', async () => {
      await renderRouter('./app');
      expect(screen.queryByText(strings.home.openCatalog)).toBeNull();
    });

    it("renvoie à l'accueil quand on vise le catalogue", async () => {
      await renderRouter('./app', { initialUrl: '/dev/catalog' });
      expect(screen).toHavePathname('/');
      expect(screen.queryByText(strings.catalog.title)).toBeNull();
    });
  });
});

// Les fichiers servis ont été calculés le 17 novembre 2026 à 21 h 27 UTC : 22 h 27 à Paris.
describe('fraîcheur de la prévision', () => {
  /** Ouvre l'app à un instant donné : l'horloge est figée avant le rendu, et `renderRouter` la garde. */
  async function openAt(instant: string): Promise<void> {
    jest.useFakeTimers({ now: new Date(instant) });
    await renderRouter('./app');
  }

  afterEach(closeApp);

  it('dit l’heure de mise à jour de chaque ville, à l’heure de Paris', async () => {
    servePublished(allPublished);
    await openAt('2026-11-17T22:00:00Z');

    const updated = strings.freshness.updatedToday('22\u00a0h\u00a027');
    await waitFor(() => expect(screen.getAllByText(updated)).toHaveLength(2));
    expect(screen.getAllByText(strings.home.upcoming(145, 7))).toHaveLength(2);
    expect(screen.queryByText(strings.freshness.staleTitle)).toBeNull();
    expect(screen.queryByText(strings.states.emptyTitle)).toBeNull();
  });

  it('ne compte plus le jour ni les heures passés quand on ouvre le lendemain', async () => {
    servePublished(allPublished);
    await openAt('2026-11-18T07:00:00Z');

    const updated = strings.freshness.updatedYesterday('22\u00a0h\u00a027');
    await waitFor(() => expect(screen.getAllByText(updated)).toHaveLength(2));
    expect(screen.getAllByText(strings.home.upcoming(136, 6))).toHaveLength(2);
    expect(screen.queryByText(strings.freshness.staleTitle)).toBeNull();
  });

  it('affiche le bandeau « prévision ancienne » au-delà de douze heures', async () => {
    servePublished(allPublished);
    await openAt('2026-11-18T11:00:00Z');

    await waitFor(() => expect(screen.getAllByText(strings.freshness.staleTitle)).toHaveLength(2));
    const detail = strings.freshness.staleDetail(strings.freshness.hours(13));
    expect(screen.getAllByText(detail)).toHaveLength(2);
    expect(screen.getAllByRole('alert')).toHaveLength(2);
  });

  it('fait apparaître le bandeau quand la prévision vieillit, écran resté ouvert', async () => {
    servePublished(allPublished);
    // Onze heures et cinquante-deux minutes après le calcul : pas encore ancienne.
    await openAt('2026-11-18T09:20:00Z');
    await waitFor(() => expect(screen.getAllByText(strings.home.upcoming(134, 6))).toHaveLength(2));
    expect(screen.queryByText(strings.freshness.staleTitle)).toBeNull();

    await act(() => jest.advanceTimersByTime(10 * 60_000));
    expect(screen.getAllByText(strings.freshness.staleTitle)).toHaveLength(2);
  });
});

describe('sans aucune prévision', () => {
  afterEach(closeApp);

  it('premier lancement hors ligne : un état vide qui dit pourquoi, pas un écran blanc ni des zéros', async () => {
    offline();
    await renderRouter('./app');

    // Le client de l'app retente une fois, après une seconde, avant de renoncer.
    await waitFor(() => expect(screen.getAllByText(strings.states.emptyTitle)).toHaveLength(2), {
      timeout: 5000,
    });
    expect(screen.getAllByText(strings.states.empty.network)).toHaveLength(2);
    expect(screen.getAllByText(strings.states.retry)).toHaveLength(2);
    expect(screen.queryByText(/\b0\b/)).toBeNull();
    expect(screen.queryByText(strings.states.loading)).toBeNull();
  });

  it('annonce le chargement tant que rien n’est arrivé', async () => {
    global.fetch = jest.fn(() => new Promise<Response>(() => undefined));
    await renderRouter('./app');
    await waitFor(() => expect(screen.getAllByText(strings.states.loading)).toHaveLength(2));
    expect(screen.queryByText(strings.states.emptyTitle)).toBeNull();
  });

  it('demande de mettre l’app à jour quand les fichiers sont d’une version inconnue', async () => {
    servePublished({
      'forecast/toulon.json': { json: { schemaVersion: 2 } },
      'forecast/nice.json': { json: { schemaVersion: 2 } },
    });
    await renderRouter('./app');

    await waitFor(() => expect(screen.getAllByText(strings.states.empty.version)).toHaveLength(2), {
      timeout: 5000,
    });
    // Réessayer n'y changerait rien : l'app ne le propose pas.
    expect(screen.queryByText(strings.states.retry)).toBeNull();
  });
});
