// Écrit le résultat d'un amorçage dans le dossier de données : l'état, les cases et les
// mesures des derniers jours, et le registre de tous les jours jugés.

import type { ConfiguredCity } from '../../shared/cities.ts';
import type { Observations } from '../../shared/series.ts';
import { FORECAST_VARIABLES } from '../../shared/variables.ts';
import type { ForecastVariable } from '../../shared/variables.ts';
import { archiveDays } from '../archive/days.ts';
import { archivePass } from '../archive/forecasts.ts';
import type { Cell } from '../archive/forecasts.ts';
import { archiveObservations } from '../archive/observations.ts';
import { VERIFICATION_WINDOW_DAYS } from '../config.ts';
import { DAY_MS, toInstant, utcDateOf } from '../instant.ts';
import { loadCityState, saveCityState } from '../state/cityState.ts';
import type { CityState } from '../state/cityState.ts';
import type { Storage } from '../storage.ts';
import { replayHistory } from './replay.ts';
import type { History } from './replay.ts';

/** Marge au-delà de la période des scores : un jour civil de Paris déborde sur ses voisins en UTC. */
const ARCHIVE_MARGIN_DAYS = 3;

/** Lève une erreur si une ville a déjà un état : l'amorçage ne remplace rien sans qu'on le lui demande. */
export async function refuseExistingStates(
  storage: Storage,
  cities: readonly ConfiguredCity[],
): Promise<void> {
  for (const city of cities) {
    if ((await loadCityState(storage, city.id)) !== null) {
      throw new Error(
        `${city.name} a déjà un état (state/${city.id}.json). L'amorçage le remplacerait par un état reconstruit depuis l'historique : relancer avec --force pour le confirmer.`,
      );
    }
  }
}

function observationsSince(history: History, stationId: string, from: number): Observations {
  const times = [...history.observations.keys()]
    .filter((time) => time >= from)
    .sort((a, b) => a - b);
  return {
    stationId,
    times: times.map((time) => toInstant(time)),
    values: Object.fromEntries(
      FORECAST_VARIABLES.map((variable) => [
        variable,
        times.map((time) => history.observations.get(time)?.[variable] ?? null),
      ]),
    ) as Record<ForecastVariable, (number | null)[]>,
  };
}

/** Une case d'échéance N a été émise N jours avant son heure de validité. */
const issueDateOf = (cell: Cell): string => utcDateOf(cell.time - cell.lead * DAY_MS);

/**
 * Amorce une ville : rejoue son historique et écrit l'état et l'archive de départ. L'état est
 * écrit en dernier, comme dans un passage.
 */
export async function bootstrapCity(
  storage: Storage,
  city: ConfiguredCity,
  history: History,
): Promise<CityState> {
  const archiveFrom = history.lastHour - (VERIFICATION_WINDOW_DAYS + ARCHIVE_MARGIN_DAYS) * DAY_MS;
  const { state, cells, days } = replayHistory(city.id, history, archiveFrom);

  await archiveObservations(
    storage,
    city.id,
    observationsSince(history, city.station.id, archiveFrom),
  );
  const byIssueDate = Map.groupBy(cells, issueDateOf);
  for (const [date, issued] of [...byIssueDate].sort(([a], [b]) => a.localeCompare(b))) {
    await archivePass(storage, city.id, { collectedAt: `${date}T23:00:00Z`, cells: issued });
  }
  await archiveDays(storage, city.id, days);
  await saveCityState(storage, state);
  return state;
}
