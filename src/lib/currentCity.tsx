// La ville que l'app montre. Tous les écrans la lisent ici : en changer met à jour l'accueil
// et les écrans de détail d'un même geste. La dernière ville consultée est gardée sur
// l'appareil, et l'app rouvre dessus.

import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';

import { CITIES } from '@shared/cities';
import type { CityId, ConfiguredCity } from '@shared/cities';

import { useStoredPreference } from './preferences';

type CurrentCity = {
  readonly city: ConfiguredCity;
  readonly selectCity: (cityId: CityId) => void;
};

const [DEFAULT_CITY] = CITIES;

const CurrentCityContext = createContext<CurrentCity | null>(null);

/** Vrai pour une ville de la configuration : une ville retirée depuis n'est plus valide. */
export const isCityId = (value: string): value is CityId =>
  CITIES.some((city) => city.id === value);

/**
 * Donne la ville courante à l'app. Rien n'est affiché tant que la ville enregistrée n'a pas
 * été lue (quelques millisecondes) : l'app n'ouvre pas sur une ville pour sauter à une autre.
 */
export function CurrentCityProvider({ children }: { readonly children: ReactNode }) {
  const { stored, save } = useStoredPreference('city', isCityId);
  const value = useMemo<CurrentCity>(
    () => ({
      city: CITIES.find((city) => city.id === stored) ?? DEFAULT_CITY,
      selectCity: save,
    }),
    [stored, save],
  );
  if (stored === undefined) return null;
  return <CurrentCityContext.Provider value={value}>{children}</CurrentCityContext.Provider>;
}

export function useCurrentCity(): CurrentCity {
  const value = useContext(CurrentCityContext);
  if (value === null) throw new Error('useCurrentCity doit être appelé sous CurrentCityProvider');
  return value;
}
