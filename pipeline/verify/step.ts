// Archive et vérification d'une ville pour un passage : on range ce qui vient d'être
// collecté, on apprend des heures dont la mesure est arrivée, on calcule les scores.
//
// Ordre des écritures : les archives d'abord, l'état en dernier. Si le passage s'interrompt
// entre les deux, le relancer refait les mêmes écritures et arrive au même résultat.

import { BLEND_CONFIG, MAX_LEAD_DAYS } from '../../shared/blendConfig.ts';
import type { ConfiguredCity } from '../../shared/cities.ts';
import { parisDateKey } from '../../shared/parisTime.ts';
import type { VerificationFile } from '../../shared/schemas.ts';
import type { CityForecasts, Observations } from '../../shared/series.ts';
import { archiveDays, readDays } from '../archive/days.ts';
import { archivePass, readCells } from '../archive/forecasts.ts';
import { archiveObservations, readObservations } from '../archive/observations.ts';
import { buildPass } from '../blend/hour.ts';
import { DAY_MS, HOUR_MS, floorToHour } from '../instant.ts';
import {
  emptyCityState,
  loadCityState,
  normalizeCityState,
  saveCityState,
} from '../state/cityState.ts';
import type { CityState } from '../state/cityState.ts';
import type { Storage } from '../storage.ts';
import { learn } from './learn.ts';
import { buildVerification, scoresWindowStart } from './scores.ts';

/** Marge de lecture autour de la période des scores : un jour civil déborde sur ses voisins en UTC. */
const READ_MARGIN_MS = 3 * DAY_MS;

export type VerifiedCity = {
  /** État après apprentissage : c'est avec lui que le passage mélange. */
  readonly state: CityState;
  readonly verification: VerificationFile;
};

/** Scores d'une ville, recalculés à partir de l'archive seule. */
export async function verificationFromArchive(
  storage: Storage,
  city: ConfiguredCity,
  state: CityState,
  generatedAt: string,
): Promise<VerificationFile> {
  const through = state.learnedThrough === null ? null : Date.parse(state.learnedThrough);
  if (through === null) {
    return buildVerification({
      cityId: city.id,
      generatedAt,
      through,
      cells: { at: () => undefined, earliest: null },
      observations: new Map(),
      days: [],
    });
  }
  const from = scoresWindowStart(through);
  return buildVerification({
    cityId: city.id,
    generatedAt,
    through,
    cells: await readCells(storage, city.id, from, through),
    observations: await readObservations(storage, city.id, from, through),
    days: await readDays(
      storage,
      city.id,
      parisDateKey(new Date(from)),
      parisDateKey(new Date(through)),
    ),
  });
}

export async function archiveAndVerify(
  storage: Storage,
  city: ConfiguredCity,
  collected: { readonly forecasts: CityForecasts; readonly observations: Observations },
  log: (message: string) => void,
): Promise<VerifiedCity> {
  const collectedAt = Date.parse(collected.forecasts.collectedAt);
  const before = (await loadCityState(storage, city.id)) ?? emptyCityState(city.id);

  const added = await archiveObservations(storage, city.id, collected.observations);
  log(`${city.name} : ${added} mesures nouvelles dans l'archive`);

  // Une mesure met jusqu'à `observationDelayHours` à être publiée : on n'apprend pas plus près.
  const until = floorToHour(collectedAt) - BLEND_CONFIG.observationDelayHours * HOUR_MS;
  const learnFrom =
    before.learnedThrough === null ? null : Date.parse(before.learnedThrough) + HOUR_MS;
  const readFrom = (learnFrom ?? collectedAt - (MAX_LEAD_DAYS + 1) * DAY_MS) - READ_MARGIN_MS;
  const learning = learn(before, {
    cells: await readCells(storage, city.id, readFrom, until),
    observations: await readObservations(storage, city.id, readFrom, until),
    until,
  });
  log(
    `${city.name} : ${learning.hoursLearned} heures apprises, ${learning.hoursWithoutObservation} sans mesure, ${learning.days.length} jours jugés`,
  );
  await archiveDays(storage, city.id, learning.days);

  const state = normalizeCityState(learning.state);
  await archivePass(storage, city.id, buildPass(collected.forecasts, state, state.lastCollectedAt));
  state.lastCollectedAt = collected.forecasts.collectedAt;
  await saveCityState(storage, state);

  return {
    state,
    verification: await verificationFromArchive(
      storage,
      city,
      state,
      collected.forecasts.collectedAt,
    ),
  };
}
