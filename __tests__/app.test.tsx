import { renderRouter, screen } from 'expo-router/testing-library';

import { strings } from '@/i18n';

describe("l'app", () => {
  it("s'ouvre sur l'écran provisoire, qui affiche le nom de l'app", async () => {
    await renderRouter('./app');

    expect(screen).toHavePathname('/');
    expect(screen.getByRole('header', { name: strings.app.name })).toBeOnTheScreen();
    expect(screen.getByText(strings.home.placeholder)).toBeOnTheScreen();
  });
});
