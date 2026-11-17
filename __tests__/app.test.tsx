import { fireEvent } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';

import { strings } from '@/i18n';

describe("l'app", () => {
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
