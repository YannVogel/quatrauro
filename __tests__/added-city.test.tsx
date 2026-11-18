// Ajouter une ville ne demande qu'une entrée de configuration : ce test en ajoute une à
// `shared/cities.ts` et vérifie qu'elle apparaît dans l'app sans autre changement de code.
// Hyères n'est pas une ville de Quatrauro : sa « prévision » est celle de Toulon, recopiée
// pour le test.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { cleanup, fireEvent, waitFor } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';

import { strings } from '@/i18n';
import { queryClient } from '@/lib/queryClient';
import { allPublished, published, servePublished } from '@/lib/testing/published';

jest.mock('@shared/cities', () => {
  const actual = jest.requireActual<typeof import('@shared/cities')>('@shared/cities');
  const hyeres = {
    id: 'hyeres',
    name: 'Hyères',
    latitude: 43.1204,
    longitude: 6.1286,
    elevation: 40,
    station: { ...actual.CITIES[0].station, id: '83069001', name: 'HYERES' },
  };
  const cities = [...actual.CITIES, hyeres];
  return {
    ...actual,
    CITIES: cities,
    CITY_IDS: cities.map((city) => city.id),
  };
});

const NBSP = ' ';

afterEach(async () => {
  await cleanup();
  queryClient.clear();
  await AsyncStorage.clear();
});

describe('ville ajoutée à la configuration', () => {
  it('apparaît dans le sélecteur, se charge, s’affiche et se mémorise', async () => {
    const requested = servePublished({
      ...allPublished,
      'forecast/hyeres.json': { json: { ...published.forecast.toulon, city: 'hyeres' } },
    });
    jest.useFakeTimers({ now: new Date('2026-11-18T08:30:00Z') });
    await renderRouter('./app');

    const hyeres = await waitFor(() => screen.getByRole('radio', { name: 'Hyères' }));
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    // Les trois villes sont préchargées, la nouvelle comprise.
    await waitFor(() =>
      expect(requested.some((url) => url.endsWith('/forecast/hyeres.json'))).toBe(true),
    );

    await fireEvent.press(hyeres);
    expect(screen.getByRole('radio', { name: 'Hyères' })).toBeChecked();
    await waitFor(() =>
      expect(screen.getByText(strings.home.reliability(`62${NBSP}%`))).toBeOnTheScreen(),
    );
    expect(await AsyncStorage.getItem('quatrauro-preference-city')).toBe('hyeres');
  });
});
