// Écran « À propos des données » : les sources et leurs mentions, le principe, les limites.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking } from 'react-native';
import { cleanup, fireEvent, waitFor, within } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';

import { strings } from '@/i18n';
import { queryClient } from '@/lib/queryClient';
import { allPublished, offline, servePublished } from '@/lib/testing/published';
import type { Reply } from '@/lib/testing/published';
import { CITIES } from '@shared/cities';
import { MODELS } from '@shared/models';

// La configuration de l'app n'existe pas sous Jest : la version est donnée ici.
jest.mock('@/lib/appVersion', () => ({ appVersion: '1.4.0' }));

const { about, home, conditions, states } = strings;
const NBSP = ' ';
/** Mercredi matin, 9 h 30 à Paris. Les fichiers ont été calculés la veille à 22 h 27. */
const NOW = '2026-11-18T08:30:00Z';

let openURL: jest.SpyInstance;

beforeEach(() => {
  openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
});

afterEach(async () => {
  await cleanup();
  queryClient.clear();
  await AsyncStorage.clear();
  jest.restoreAllMocks();
});

async function openAbout(files: Readonly<Record<string, Reply>> = allPublished): Promise<void> {
  servePublished(files);
  jest.useFakeTimers({ now: new Date(NOW) });
  await renderRouter('./app');
  await waitFor(() => expect(screen.getByText(home.links.about)).toBeOnTheScreen());
  await fireEvent.press(screen.getByRole('link', { name: home.links.about }));
  expect(screen).toHavePathname('/about');
}
const sources = () => within(screen.getByTestId('about-sources'));
const link = (name: string) => screen.getByRole('link', { name });

describe('écran « À propos des données »', () => {
  it('s’ouvre depuis l’accueil, et y ramène', async () => {
    await openAbout();
    expect(screen.getByRole('header', { name: about.title })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: about.back }));
    expect(screen).toHavePathname('/');
  });

  it('cite Open-Meteo par la mention et le lien que demande sa licence', async () => {
    await openAbout();
    await fireEvent.press(link(about.openMeteoCredit));
    expect(openURL).toHaveBeenLastCalledWith('https://open-meteo.com/');
    // La licence demande aussi de dire que les données ont été modifiées.
    expect(sources().getByText(about.openMeteoChanges)).toBeOnTheScreen();
    await fireEvent.press(link(about.ccBy));
    expect(openURL).toHaveBeenLastCalledWith(expect.stringContaining('creativecommons.org'));
  });

  it('cite le fournisseur de chaque modèle configuré', async () => {
    await openAbout();
    for (const model of MODELS) {
      const line = sources().getByText(new RegExp(`^${model.provider} : .*${model.name}`));
      expect(line).toBeOnTheScreen();
    }
  });

  it('cite Météo-France pour les observations, avec la station de chaque ville', async () => {
    await openAbout();
    await fireEvent.press(link(about.observationsCredit));
    expect(openURL).toHaveBeenLastCalledWith(expect.stringContaining('data.gouv.fr/datasets/'));
    for (const city of CITIES) {
      expect(
        sources().getByText(about.station(city.name, city.station.name, city.station.id)),
      ).toBeOnTheScreen();
    }
    expect(sources().getByText(about.stationNote)).toBeOnTheScreen();
    await fireEvent.press(link(about.openLicence));
    expect(openURL).toHaveBeenLastCalledWith(expect.stringContaining('licences/etalab-2.0'));
  });

  it('explique le principe en quelques phrases', async () => {
    await openAbout();
    const principle = within(screen.getByTestId('about-principle'));
    expect(about.principle.length).toBeLessThanOrEqual(4);
    for (const sentence of about.principle) {
      expect(principle.getByText(sentence)).toBeOnTheScreen();
    }
  });

  it('rappelle les limites, et renvoie à la carte de vigilance de Météo-France', async () => {
    await openAbout();
    const limits = within(screen.getByTestId('about-limits'));
    expect(limits.getByText(about.personalTool)).toBeOnTheScreen();
    expect(limits.getByText('Il ne couvre que Toulon et Nice.')).toBeOnTheScreen();
    expect(limits.getByText(about.notOfficial)).toBeOnTheScreen();
    await fireEvent.press(link(about.vigilance));
    expect(openURL).toHaveBeenLastCalledWith('https://vigilance.meteofrance.fr/fr');
  });

  it('donne la version de l’app et la date du dernier calcul', async () => {
    await openAbout();
    expect(screen.getByText(/Version 1\.4\.0/)).toBeOnTheScreen();
    await waitFor(() =>
      expect(
        // Les espaces de l'heure sont insécables : le motif accepte toute espace.
        screen.getByText(/Dernier calcul pour Toulon : mardi 17 novembre à 22\sh\s27/),
      ).toBeOnTheScreen(),
    );
  });

  it('affiche l’adresse quand la page ne peut pas être ouverte', async () => {
    openURL.mockRejectedValue(new Error('aucun navigateur'));
    await openAbout();
    await fireEvent.press(link(about.vigilance));
    await waitFor(() =>
      expect(
        screen.getByText(about.linkFailed('https://vigilance.meteofrance.fr/fr')),
      ).toBeOnTheScreen(),
    );
  });

  it('cite les sources même sans aucune prévision, et dit que le calcul est inconnu', async () => {
    offline();
    jest.useFakeTimers({ now: new Date(NOW) });
    await renderRouter('./app');
    // Le client de l'app retente une fois, après une seconde, avant de renoncer.
    await waitFor(() => expect(screen.getByText(states.emptyTitle)).toBeOnTheScreen(), {
      timeout: 5000,
    });
    await fireEvent.press(screen.getByRole('link', { name: home.links.about }));

    expect(link(about.openMeteoCredit)).toBeOnTheScreen();
    expect(link(about.observationsCredit)).toBeOnTheScreen();
    expect(screen.getByText(new RegExp(about.computedUnknown))).toBeOnTheScreen();
    expect(screen.queryByText(conditions.clear)).toBeNull();
  });
});
