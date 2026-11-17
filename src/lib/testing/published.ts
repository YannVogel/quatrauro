// Pour les tests : les fichiers publiés enregistrés, et un faux réseau qui les sert.

import forecastNice from '../__fixtures__/published/forecast-nice.json';
import forecastToulon from '../__fixtures__/published/forecast-toulon.json';
import verificationNice from '../__fixtures__/published/verification-nice.json';
import verificationToulon from '../__fixtures__/published/verification-toulon.json';

import { forecastFileSchema, verificationFileSchema } from '@shared/schemas';
import type { ForecastFile, VerificationFile } from '@shared/schemas';

import { env } from '../env';

/** De vrais fichiers, produits par le pipeline le 17 novembre 2026 (voir `__fixtures__/README.md`). */
export const published = {
  forecast: {
    toulon: forecastFileSchema.parse(forecastToulon),
    nice: forecastFileSchema.parse(forecastNice),
  } satisfies Record<string, ForecastFile>,
  verification: {
    toulon: verificationFileSchema.parse(verificationToulon),
    nice: verificationFileSchema.parse(verificationNice),
  } satisfies Record<string, VerificationFile>,
};

/** Ce que le faux réseau répond pour un fichier : son contenu, un statut d'erreur, ou une panne. */
export type Reply =
  { readonly json: unknown } | { readonly status: number } | { readonly failure: string };

export const allPublished: Readonly<Record<string, Reply>> = {
  'forecast/toulon.json': { json: published.forecast.toulon },
  'forecast/nice.json': { json: published.forecast.nice },
  'verification/toulon.json': { json: published.verification.toulon },
  'verification/nice.json': { json: published.verification.nice },
};

const OK = 200;
const NOT_FOUND = 404;

/**
 * Remplace `fetch` par un réseau qui sert ces fichiers ; tout autre chemin répond 404. Rend
 * la liste des adresses demandées.
 */
export function servePublished(files: Readonly<Record<string, Reply>>): string[] {
  const requested: string[] = [];
  global.fetch = jest.fn((input: RequestInfo | URL) => {
    const url = String(input);
    requested.push(url);
    const reply: Reply = files[url.replace(`${env.dataUrl}/`, '')] ?? { status: NOT_FOUND };
    if ('failure' in reply) return Promise.reject(new TypeError(reply.failure));
    const status = 'status' in reply ? reply.status : OK;
    const body = 'json' in reply ? reply.json : null;
    return Promise.resolve({
      ok: status === OK,
      status,
      json: () =>
        typeof body === 'string' ? Promise.reject(new SyntaxError(body)) : Promise.resolve(body),
    } as Response);
  });
  return requested;
}

/** Un réseau coupé : aucune réponse, pour aucun fichier. */
export const offline = (): string[] =>
  servePublished(
    Object.fromEntries(
      Object.keys(allPublished).map((file) => [file, { failure: 'Network request failed' }]),
    ),
  );
