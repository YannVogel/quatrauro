// Cache des fichiers publiés : TanStack Query, enregistré sur l'appareil. L'app s'ouvre sur
// la dernière prévision reçue, puis la rafraîchit en arrière-plan.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient, focusManager } from '@tanstack/react-query';
import type { Query } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import type { Persister } from '@tanstack/react-query-persist-client';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { AppState } from 'react-native';

import { CITY_IDS } from '@shared/cities';
import type { CityId } from '@shared/cities';
import { SCHEMA_VERSION } from '@shared/schemas';

import { fetchForecast, fetchVerification } from './data';

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/** Les fichiers bruts de GitHub sont en cache cinq minutes (ADR 0004) : redemander plus tôt ne rapporte rien. */
const STALE_AFTER_MS = 5 * MINUTE_MS;
/** Au-delà de sept jours, une prévision ne décrit plus que des jours passés : le cache est abandonné. */
const CACHE_MAX_AGE_MS = 7 * DAY_MS;
const STORAGE_KEY = 'quatrauro-published-files';
const PERSIST_THROTTLE_MS = 1000;

export const queryKeys = {
  forecast: (cityId: CityId) => ['forecast', cityId] as const,
  verification: (cityId: CityId) => ['verification', cityId] as const,
};

export const forecastQuery = (cityId: CityId) => ({
  queryKey: queryKeys.forecast(cityId),
  queryFn: () => fetchForecast(cityId),
});

export const verificationQuery = (cityId: CityId) => ({
  queryKey: queryKeys.verification(cityId),
  queryFn: () => fetchVerification(cityId),
});

type ClientOptions = {
  /** Nouvelles tentatives après un échec ; `false` dans les tests, pour ne pas attendre. */
  readonly retry?: number | false;
  readonly staleTime?: number;
};

export function createQueryClient(options: ClientOptions = {}): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: options.staleTime ?? STALE_AFTER_MS,
        // Doit couvrir la durée de vie du cache enregistré, sinon il est jeté à la relecture.
        gcTime: CACHE_MAX_AGE_MS,
        retry: options.retry ?? 1,
      },
    },
  });
}

export function createPersister(throttleTime: number = PERSIST_THROTTLE_MS): Persister {
  return createAsyncStoragePersister({ storage: AsyncStorage, key: STORAGE_KEY, throttleTime });
}

/**
 * Une requête qui porte une donnée est enregistrée, même si son dernier rafraîchissement a
 * échoué : un fichier invalide ou une coupure ne doit pas effacer la prévision déjà reçue.
 */
const holdsData = (query: Query): boolean => query.state.data !== undefined;

/** Le client de l'app. Les tests qui rendent l'app entière le vident entre deux cas. */
export const queryClient = createQueryClient();
const defaultPersister = createPersister();

/** Le retour de l'app au premier plan compte comme un « focus » : les données périmées sont redemandées. */
function useRefetchOnForeground(): void {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      focusManager.setFocused(status === 'active');
    });
    return () => subscription.remove();
  }, []);
}

type QueryProviderProps = {
  readonly children: ReactNode;
  /** Pour les tests : un client et un stockage à part. */
  readonly client?: QueryClient;
  readonly persister?: Persister;
};

export function QueryProvider({
  children,
  client = queryClient,
  persister = defaultPersister,
}: QueryProviderProps) {
  useRefetchOnForeground();
  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{
        persister,
        maxAge: CACHE_MAX_AGE_MS,
        // Un cache écrit pour une autre version du contrat est ignoré.
        buster: `schema-${SCHEMA_VERSION}`,
        dehydrateOptions: { shouldDehydrateQuery: holdsData },
      }}
      // Les deux villes sont préchargées dès que le cache est relu : la bascule est immédiate.
      // On n'attend pas la réponse : tant que cette fonction n'a pas rendu la main, l'app ne
      // montre pas le cache, et un réseau lent retarderait l'affichage.
      onSuccess={() => {
        for (const cityId of CITY_IDS) void client.prefetchQuery(forecastQuery(cityId));
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
