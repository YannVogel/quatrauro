import AsyncStorage from '@react-native-async-storage/async-storage';
import type { QueryClient } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { env } from '@/lib/env';
import { QueryProvider, createPersister, createQueryClient } from '@/lib/queryClient';
import { allPublished, offline, published, servePublished } from '@/lib/testing/published';
import type { Reply } from '@/lib/testing/published';

import { useForecast } from '../hooks/useForecast';
import { useVerification } from '../hooks/useVerification';

const toulon = published.forecast.toulon;
/** La même prévision, recalculée six heures plus tard. */
const newer = { ...toulon, generatedAt: '2026-11-18T03:27:43Z' };

/**
 * Une ouverture de l'app : un client neuf, branché sur le stockage de l'appareil (simulé, et
 * conservé d'une ouverture à l'autre). Les données y sont tout de suite périmées, pour que
 * chaque ouverture redemande les fichiers.
 */
const opened: QueryClient[] = [];

function openApp() {
  const client = createQueryClient({ retry: false, staleTime: 0 });
  opened.push(client);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryProvider client={client} persister={createPersister(0)}>
      {children}
    </QueryProvider>
  );
  return { wrapper };
}

/** Une réponse du réseau que le test libère quand il veut. */
function delayedToulon(): { readonly release: (reply: Reply) => Promise<void> } {
  let resolve: (reply: Reply) => void = () => undefined;
  const pending = new Promise<Reply>((done) => {
    resolve = done;
  });
  servePublished(allPublished);
  const immediate = global.fetch as jest.Mock<Promise<Response>, [string]>;
  const serve = immediate.getMockImplementation();
  immediate.mockImplementation(async (url) => {
    if (!url.endsWith('forecast/toulon.json'))
      return (serve as (url: string) => Promise<Response>)(url);
    const reply = await pending;
    return {
      ok: true,
      status: 200,
      json: () => Promise.resolve('json' in reply ? reply.json : null),
    } as Response;
  });
  return {
    release: async (reply) => {
      resolve(reply);
      await pending;
    },
  };
}

const withToulon = (reply: Reply): Record<string, Reply> => ({
  ...allPublished,
  'forecast/toulon.json': reply,
});

/** Attend que le cache ait été écrit sur l'appareil avec cette prévision de Toulon. */
const waitForSaved = (generatedAt: string) =>
  waitFor(async () => {
    const saved = await AsyncStorage.getItem('quatrauro-published-files');
    expect(saved).toContain(`"generatedAt":"${generatedAt}"`);
  });

/** Première ouverture, en ligne : la prévision est reçue et enregistrée. */
async function firstOpening(): Promise<void> {
  servePublished(allPublished);
  const { wrapper } = openApp();
  const { result, unmount } = await renderHook(() => useForecast('toulon'), { wrapper });
  await waitFor(() => expect(result.current.data).not.toBeNull());
  await waitForSaved(toulon.generatedAt);
  await unmount();
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

// Un client garde ses minuteries (durée de vie du cache) tant qu'il n'est pas vidé. On attend
// d'abord que ses téléchargements en cours (le préchargement de l'autre ville) soient finis,
// pour qu'aucune réponse n'arrive après la fin du test.
afterEach(async () => {
  for (const client of opened.splice(0)) {
    await waitFor(() => expect(client.isFetching()).toBe(0));
    client.clear();
  }
});

describe('premier chargement', () => {
  it('annonce le chargement, puis rend la prévision de la ville', async () => {
    const network = delayedToulon();
    const { result } = await renderHook(() => useForecast('toulon'), openApp());

    await waitFor(() => expect(result.current.isLoading).toBe(true));
    expect(result.current.data).toBeNull();
    expect(result.current.isRefreshing).toBe(false);

    void network.release({ json: toulon });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(toulon);
    expect(result.current.data?.city).toBe('toulon');
    expect(result.current.error).toBeNull();
    expect(result.current.isRefreshing).toBe(false);
  });

  it('précharge les deux villes, et ne demande rien qu’aux fichiers publiés', async () => {
    const requested = servePublished(allPublished);
    const { result } = await renderHook(() => useForecast('toulon'), openApp());
    await waitFor(() => expect(result.current.data).not.toBeNull());
    await waitFor(() => expect(requested).toContain(`${env.dataUrl}/forecast/nice.json`));

    expect(requested).toContain(`${env.dataUrl}/forecast/toulon.json`);
    for (const url of requested) {
      expect(url.startsWith('https://raw.githubusercontent.com/YannVogel/quatrauro/data/')).toBe(
        true,
      );
    }
  });

  it('demande au téléphone de ne pas répondre à la place du serveur', async () => {
    servePublished(allPublished);
    const { result } = await renderHook(() => useForecast('toulon'), openApp());
    await waitFor(() => expect(result.current.data).not.toBeNull());

    for (const [, init] of (global.fetch as jest.Mock).mock.calls) {
      expect(init).toEqual({ headers: { 'Cache-Control': 'no-cache' } });
    }
  });

  it('rend aussi les scores d’une ville', async () => {
    servePublished(allPublished);
    const { result } = await renderHook(() => useVerification('nice'), openApp());
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.data).toEqual(published.verification.nice);
  });
});

describe('ouverture suivante', () => {
  it('affiche d’abord le cache, puis la version rafraîchie', async () => {
    await firstOpening();
    const network = delayedToulon();

    const { result } = await renderHook(() => useForecast('toulon'), openApp());
    await waitFor(() => expect(result.current.data).not.toBeNull());
    // Le réseau n'a pas encore répondu : c'est le cache, et le rafraîchissement est annoncé.
    expect(result.current.data?.generatedAt).toBe(toulon.generatedAt);
    expect(result.current.isLoading).toBe(false);
    await waitFor(() => expect(result.current.isRefreshing).toBe(true));

    void network.release({ json: newer });
    await waitFor(() => expect(result.current.data?.generatedAt).toBe(newer.generatedAt));
    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('hors ligne, affiche la dernière prévision reçue', async () => {
    await firstOpening();
    offline();
    const { result } = await renderHook(() => useForecast('toulon'), openApp());

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.data).toEqual(toulon);
    expect(result.current.error?.kind).toBe('network');
    expect(result.current.isLoading).toBe(false);
  });
});

describe('fichier refusé', () => {
  const { hourly: _hourly, ...withoutHours } = toulon;
  const refused: readonly (readonly [string, Reply, string])[] = [
    ['invalide (sans ses heures)', { json: withoutHours }, 'invalid'],
    ['qui n’est pas du JSON', { json: 'Unexpected token <' }, 'invalid'],
    ['d’une autre ville', { json: published.forecast.nice }, 'invalid'],
    ['d’une version inconnue', { json: { ...newer, schemaVersion: 2 } }, 'version'],
    ['absent du serveur', { status: 404 }, 'http'],
  ];

  it.each(refused)(
    'un fichier %s ne remplace jamais la prévision en cache',
    async (_name, reply, kind) => {
      servePublished(allPublished);
      const { result } = await renderHook(() => useForecast('toulon'), openApp());
      await waitFor(() => expect(result.current.data).not.toBeNull());

      servePublished(withToulon(reply));
      void result.current.refresh();

      // Le cache prévient le composant un instant après la fin du téléchargement.
      await waitFor(() => expect(result.current.error?.kind).toBe(kind));
      expect(result.current.data).toEqual(toulon);
      expect(result.current.isRefreshing).toBe(false);
    },
  );

  it('la prévision valide survit aussi à la fermeture de l’app', async () => {
    await firstOpening();
    // Deuxième ouverture : le serveur rend un fichier invalide.
    servePublished(withToulon({ json: withoutHours }));
    const second = await renderHook(() => useForecast('toulon'), openApp());
    await waitFor(() => expect(second.result.current.error?.kind).toBe('invalid'));
    expect(second.result.current.data).toEqual(toulon);
    // Attend que le cache ait été réécrit avec cet échec, puis ferme l'app : c'est cette
    // écriture-là qui ne doit pas perdre la prévision.
    await waitFor(async () => {
      const saved = await AsyncStorage.getItem('quatrauro-published-files');
      expect(saved).toContain('"status":"error"');
      expect(saved).toContain(`"generatedAt":"${toulon.generatedAt}"`);
    });
    await second.unmount();

    // Troisième ouverture, hors ligne : la prévision valide est toujours là.
    offline();
    const third = await renderHook(() => useForecast('toulon'), openApp());
    await waitFor(() => expect(third.result.current.error?.kind).toBe('network'));
    expect(third.result.current.data).toEqual(toulon);
  });
});

describe('sans cache', () => {
  it('hors ligne, ne rend aucune donnée et dit pourquoi', async () => {
    offline();
    const { result } = await renderHook(() => useForecast('toulon'), openApp());
    await waitFor(() => expect(result.current.error).not.toBeNull());

    expect(result.current.data).toBeNull();
    expect(result.current.error?.kind).toBe('network');
    expect(result.current.isLoading).toBe(false);
  });

  it('se rattrape quand on tire pour rafraîchir, une fois le réseau revenu', async () => {
    offline();
    const { result } = await renderHook(() => useForecast('toulon'), openApp());
    await waitFor(() => expect(result.current.error).not.toBeNull());

    servePublished(allPublished);
    void result.current.refresh();
    await waitFor(() => expect(result.current.data).toEqual(toulon));
    expect(result.current.error).toBeNull();
  });
});
