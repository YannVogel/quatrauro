// La commande `npm run pipeline`, sans ses branchements au monde réel : ils sont passés en
// paramètres pour que les tests la lancent sans réseau.

import path from 'node:path';

import { CITIES } from '../shared/cities.ts';
import { MODELS } from '../shared/models.ts';
import { DEFAULT_DATA_DIRECTORY, parseArguments } from './cli.ts';
import { DEFAULT_HTTP_SETTINGS } from './collect/http.ts';
import type { HttpFetch } from './collect/http.ts';
import { toInstant } from './instant.ts';
import { httpCollectors, runPass } from './pass.ts';
import { directoryStorage } from './storage.ts';

export type Environment = {
  readonly fetch: HttpFetch;
  readonly sleep: (ms: number) => Promise<void>;
  readonly now: () => Date;
  readonly log: (message: string) => void;
};

const SECOND_MS = 1000;

/**
 * Lance un passage et rend le code de sortie : 0 si les fichiers sont écrits (ou calculés à
 * blanc), 1 sinon. Usage : `npm run pipeline -- [--data-dir=<dossier>] [--dry-run]`.
 */
export async function main(argv: readonly string[], environment: Environment): Promise<number> {
  const { log } = environment;
  const startedAt = Date.now();
  try {
    const args = parseArguments(argv, ['data-dir', 'dry-run']);
    const dataDirectory = path.resolve(args.value('data-dir') ?? DEFAULT_DATA_DIRECTORY);
    const collectedAt = environment.now();
    log(`Passage du ${toInstant(collectedAt)}, dans ${dataDirectory}`);
    await runPass({
      storage: directoryStorage(dataDirectory),
      cities: CITIES,
      collectors: httpCollectors(MODELS, {
        http: { ...DEFAULT_HTTP_SETTINGS, fetch: environment.fetch, sleep: environment.sleep },
        now: () => collectedAt,
        log,
      }),
      collectedAt,
      log,
      dryRun: args.flag('dry-run'),
    });
    log(`Passage terminé en ${Math.round((Date.now() - startedAt) / SECOND_MS)} s`);
    return 0;
  } catch (error) {
    log(
      `Passage en échec, rien n'a été écrit : ${error instanceof Error ? error.message : String(error)}`,
    );
    return 1;
  }
}
