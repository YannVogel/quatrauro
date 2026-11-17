import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';

import { strings } from '@/i18n';
import { queryClient } from '@/lib/queryClient';
import { allPublished, offline, servePublished } from '@/lib/testing/published';

describe("l'app", () => {
  // Le réseau n'est pas simulé ici : les chargements échouent, et le cache est vidé après chaque cas.
  afterEach(() => queryClient.clear());

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

describe('données reçues', () => {
  afterEach(() => queryClient.clear());

  it('disent de quand date la prévision de chaque ville, à l’heure de Paris', async () => {
    servePublished(allPublished);
    await renderRouter('./app');

    // Fichiers calculés le 17 novembre 2026 à 21 h 27 UTC : 22 h 27 à Paris.
    const computed = strings.home.data.computedAt('le mardi 17 novembre à 22 h 27');
    await waitFor(() => expect(screen.getAllByText(computed)).toHaveLength(2));
    expect(screen.queryByText(strings.home.data.none)).toBeNull();
  });

  it('disent qu’il n’y a rien quand rien n’a pu être reçu', async () => {
    offline();
    await renderRouter('./app');

    // Le client de l'app retente une fois, après une seconde, avant de renoncer.
    await waitFor(() => expect(screen.getAllByText(strings.home.data.none)).toHaveLength(2), {
      timeout: 5000,
    });
    expect(screen.getAllByText(strings.home.data.refreshFailed)).toHaveLength(2);
  });
});
