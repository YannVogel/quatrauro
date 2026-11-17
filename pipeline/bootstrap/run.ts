// Amorçage : construit l'état de départ de chaque ville à partir de l'historique, pour que le
// premier passage du pipeline ait déjà des poids et un indice de fiabilité. À lancer une fois,
// à la main, avant d'activer le pipeline.
//
// Usage : npm run pipeline:bootstrap -- [--data-dir=<dossier>] [--until=AAAA-MM-JJ] [--force]

import path from 'node:path';

import { CITIES } from '../../shared/cities.ts';
import { MODELS } from '../../shared/models.ts';
import { PERIOD, VARIABLES } from '../backtest/config.ts';
import { loadCityData } from '../backtest/data/dataset.ts';
import { DEFAULT_DATA_DIRECTORY, parseArguments } from '../cli.ts';
import { DAY_MS, utcDateOf } from '../instant.ts';
import { directoryStorage } from '../storage.ts';
import { historyFromBacktest } from './history.ts';
import { bootstrapCity, refuseExistingStates } from './write.ts';

/** Les mesures de Météo-France ont jusqu'à 27 heures de retard : l'historique s'arrête l'avant-veille. */
const DEFAULT_END_DAYS_AGO = 2;
const cacheDirectory = path.join(import.meta.dirname, '..', 'backtest', '.cache');
const log = (message: string): void => console.log(message);

async function main(): Promise<void> {
  const args = parseArguments(process.argv.slice(2), ['data-dir', 'until', 'force']);
  const dataDirectory = path.resolve(args.value('data-dir') ?? DEFAULT_DATA_DIRECTORY);
  const end = args.value('until') ?? utcDateOf(Date.now() - DEFAULT_END_DAYS_AGO * DAY_MS);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(end) || end <= PERIOD.start) {
    throw new Error(`Date de fin invalide : ${end} (attendu : AAAA-MM-JJ, après ${PERIOD.start})`);
  }
  const storage = directoryStorage(dataDirectory);
  if (!args.flag('force')) await refuseExistingStates(storage, CITIES);

  // L'historique commence quand les cinq modèles y sont tous (ADR 0002).
  const period = { start: PERIOD.start, end };
  log(`Amorçage du ${period.start} au ${period.end}, dans ${dataDirectory}`);
  for (const city of CITIES) {
    const data = await loadCityData(
      cacheDirectory,
      city,
      MODELS,
      VARIABLES,
      period,
      () => undefined,
    );
    log(`${city.name} : historique lu`);
    const state = await bootstrapCity(storage, city, historyFromBacktest(data, MODELS));
    log(
      `${city.name} : état écrit, heures apprises jusqu'au ${state.learnedThrough ?? '—'}, jours jugés jusqu'au ${state.learnedDayThrough ?? '—'}`,
    );
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
