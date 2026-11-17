// La ville que l'app montre. Tous les écrans la lisent ici : en changer met à jour l'accueil
// et les écrans de détail d'un même geste.

import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { CITIES } from '@shared/cities';
import type { CityId, ConfiguredCity } from '@shared/cities';

type CurrentCity = {
  readonly city: ConfiguredCity;
  readonly selectCity: (cityId: CityId) => void;
};

const [DEFAULT_CITY] = CITIES;

const CurrentCityContext = createContext<CurrentCity | null>(null);

export const isCityId = (value: string): value is CityId =>
  CITIES.some((city) => city.id === value);

type CurrentCityProviderProps = {
  readonly children: ReactNode;
  /** Ville de départ ; par défaut, la première de la configuration. */
  readonly initialCityId?: CityId;
  /** Appelé à chaque changement de ville, pour la mémoriser. */
  readonly onChange?: (cityId: CityId) => void;
};

export function CurrentCityProvider({
  children,
  initialCityId,
  onChange,
}: CurrentCityProviderProps) {
  const [cityId, setCityId] = useState<CityId>(initialCityId ?? DEFAULT_CITY.id);
  const value = useMemo<CurrentCity>(
    () => ({
      city: CITIES.find((city) => city.id === cityId) ?? DEFAULT_CITY,
      selectCity: (next) => {
        setCityId(next);
        onChange?.(next);
      },
    }),
    [cityId, onChange],
  );
  return <CurrentCityContext.Provider value={value}>{children}</CurrentCityContext.Provider>;
}

export function useCurrentCity(): CurrentCity {
  const value = useContext(CurrentCityContext);
  if (value === null) throw new Error('useCurrentCity doit être appelé sous CurrentCityProvider');
  return value;
}
