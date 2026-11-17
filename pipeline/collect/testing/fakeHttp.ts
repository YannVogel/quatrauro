// Faux réseau pour les tests de la collecte : chaque appel reçoit la réponse suivante de la
// file, et rien n'attend vraiment.

import { readFileSync } from 'node:fs';
import path from 'node:path';

import type { HttpFetch, HttpOptions, HttpResponse } from '../http.ts';

const FIXTURES = path.join(process.cwd(), 'pipeline', '__fixtures__');

export const fixtureText = (name: string): string =>
  readFileSync(path.join(FIXTURES, name), 'utf8');
export const fixtureJson = (name: string): Record<string, unknown> =>
  JSON.parse(fixtureText(name)) as Record<string, unknown>;

export function respond(body: string | Uint8Array<ArrayBuffer>, status = 200): HttpResponse {
  const bytes = typeof body === 'string' ? new TextEncoder().encode(body) : body;
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(new TextDecoder().decode(bytes)),
    arrayBuffer: () =>
      Promise.resolve(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)),
  };
}

type Reply = HttpResponse | Error | ((url: string) => HttpResponse | Error);

/** Réseau qui rend les réponses dans l'ordre, et note les adresses appelées et les attentes. */
export function fakeHttp(replies: readonly Reply[]): {
  readonly options: HttpOptions;
  readonly urls: string[];
  readonly sleeps: number[];
} {
  const urls: string[] = [];
  const sleeps: number[] = [];
  const queue = [...replies];
  const fetch: HttpFetch = (url) => {
    urls.push(url);
    const next = queue.shift();
    if (next === undefined) return Promise.reject(new Error(`Appel inattendu : ${url}`));
    const reply = typeof next === 'function' ? next(url) : next;
    return reply instanceof Error ? Promise.reject(reply) : Promise.resolve(reply);
  };
  return {
    urls,
    sleeps,
    options: {
      fetch,
      sleep: (ms) => {
        sleeps.push(ms);
        return Promise.resolve();
      },
      timeoutMs: 1_000,
      retryDelaysMs: [5_000, 20_000],
    },
  };
}
