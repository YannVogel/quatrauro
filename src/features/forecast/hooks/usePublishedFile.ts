import { useIsRestoring, useQuery } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';
import { useCallback } from 'react';

import { DataError } from '@/lib/data';

export type PublishedData<File> = {
  /** Dernière version valide connue, venue du cache ou du réseau ; `null` s'il n'y en a aucune. */
  readonly data: File | null;
  /** Pourquoi le dernier chargement a échoué ; `data` peut rester disponible malgré tout. */
  readonly error: DataError | null;
  /** Premier chargement : il n'y a encore rien à afficher. */
  readonly isLoading: boolean;
  /** Une nouvelle version est en cours de téléchargement. */
  readonly isRefreshing: boolean;
  /** Redemande le fichier (geste « tirer pour rafraîchir »). */
  readonly refresh: () => Promise<void>;
};

const toDataError = (error: Error | null): DataError | null => {
  if (error === null) return null;
  return error instanceof DataError ? error : new DataError('network', error.message, error);
};

/** Lit un fichier publié : le cache d'abord, puis le réseau. Un échec ne retire jamais ce qui est déjà là. */
export function usePublishedFile<File>(query: {
  readonly queryKey: QueryKey;
  readonly queryFn: () => Promise<File>;
}): PublishedData<File> {
  const isRestoring = useIsRestoring();
  const { data, error, isFetching, refetch } = useQuery(query);
  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);
  const hasData = data !== undefined;

  return {
    data: data ?? null,
    error: toDataError(error),
    isLoading: !hasData && (isRestoring || isFetching),
    isRefreshing: hasData && isFetching,
    refresh,
  };
}
