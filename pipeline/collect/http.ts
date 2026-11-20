// Appel HTTP avec délai d'attente et nouvelles tentatives espacées. Le réseau et l'attente
// sont injectés : les tests ne font aucun appel réel et n'attendent pas.

export type HttpResponse = {
  readonly ok: boolean;
  readonly status: number;
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
};

export type HttpFetch = (
  url: string,
  init: { readonly signal: AbortSignal },
) => Promise<HttpResponse>;

export type HttpOptions = {
  readonly fetch: HttpFetch;
  readonly sleep: (ms: number) => Promise<void>;
  /** Délai d'attente d'une tentative, en millisecondes. */
  readonly timeoutMs: number;
  /** Attente avant chaque nouvelle tentative : sa longueur fixe le nombre de tentatives. */
  readonly retryDelaysMs: readonly number[];
};

export const DEFAULT_HTTP_SETTINGS = {
  timeoutMs: 30_000,
  retryDelaysMs: [5_000, 20_000],
} as const;

/** Le serveur a répondu, mais par un refus. `body` porte ce qu'il a dit. */
export class HttpStatusError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(url: string, status: number, body: string) {
    super(`${new URL(url).host} a répondu ${status} : ${body.slice(0, 200)}`);
    this.name = 'HttpStatusError';
    this.status = status;
    this.body = body;
  }
}

const TOO_MANY_REQUESTS = 429;
const isTransient = (status: number): boolean => status === TOO_MANY_REQUESTS || status >= 500;

/** Le message d'une erreur, suivi de son code système (`ETIMEDOUT`…) s'il ne le dit pas déjà. */
function reasonOf(error: Error): string {
  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
  return error.message.includes(code) ? error.message : `${error.message} ${code}`.trim();
}

/**
 * Ce qu'une panne réseau dit d'elle-même, cause après cause. Le `fetch` de Node ne dit que
 * « fetch failed » : la raison (nom introuvable, connexion refusée ou coupée) est dans sa cause.
 */
function describeFailure(error: unknown): string {
  const reasons: string[] = [];
  for (let current = error; current instanceof Error; current = current.cause) {
    const reason = reasonOf(current);
    if (reason !== '') reasons.push(reason);
  }
  return reasons.length > 0 ? reasons.join(' : ') : String(error);
}

async function attempt(url: string, options: HttpOptions): Promise<HttpResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  const { host } = new URL(url);
  try {
    return await options.fetch(url, { signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`Délai de ${options.timeoutMs} ms dépassé pour ${host}`, { cause: error });
    }
    throw new Error(`Pas de réponse de ${host} : ${describeFailure(error)}`, { cause: error });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Réponse à une requête GET. Une panne passagère (réseau, délai dépassé, 429, 5xx) est
 * retentée ; un refus (4xx) ne l'est pas. Après la dernière tentative, l'erreur remonte.
 */
export async function httpGet(url: string, options: HttpOptions): Promise<HttpResponse> {
  for (let tries = 0; ; tries += 1) {
    const isLastTry = tries === options.retryDelaysMs.length;
    try {
      const response = await attempt(url, options);
      if (response.ok) return response;
      const error = new HttpStatusError(url, response.status, await response.text());
      if (!isTransient(response.status) || isLastTry) throw error;
    } catch (error) {
      const isRefusal = error instanceof HttpStatusError && !isTransient(error.status);
      if (isRefusal || isLastTry) throw error;
    }
    await options.sleep(options.retryDelaysMs[tries] ?? 0);
  }
}
