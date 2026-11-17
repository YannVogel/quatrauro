// Amorçage : rejoue un historique de prévisions et de mesures comme si le pipeline avait
// tourné à chaque heure, avec le même code que les passages réels (mélange d'une heure,
// apprentissage). L'état obtenu est celui d'un pipeline qui aurait déjà plusieurs mois.
//
// À chaque heure rejouée, dans l'ordre du backtest : on apprend ce dont la mesure a eu le
// temps d'arriver, puis on émet les prévisions de cette heure pour chaque échéance.

import { BLEND_CONFIG, MAX_LEAD_DAYS } from '../../shared/blendConfig.ts';
import type { CityId } from '../../shared/cities.ts';
import type { Cell, CellIndex } from '../archive/forecasts.ts';
import type { ObservationIndex } from '../archive/observations.ts';
import { blendModels, toCell } from '../blend/hour.ts';
import type { ModelValues } from '../blend/hour.ts';
import { DAY_MS, HOUR_MS, toInstant } from '../instant.ts';
import { emptyCityState, normalizeCityState } from '../state/cityState.ts';
import type { CityState } from '../state/cityState.ts';
import { advanceLearning } from '../verify/learn.ts';
import type { DayRecord } from '../verify/learn.ts';

export type History = {
  /** Première et dernière heure de l'historique, en millisecondes. */
  readonly firstHour: number;
  readonly lastHour: number;
  /** Ce que chaque modèle prévoyait pour cette heure, `lead` jours plus tôt. */
  readonly modelsAt: (time: number, lead: number) => readonly ModelValues[];
  readonly observations: ObservationIndex;
};

export type Bootstrap = {
  readonly state: CityState;
  /** Cases des derniers jours, à archiver : celles dont les scores publiés auront besoin. */
  readonly cells: readonly Cell[];
  /** Tous les jours jugés pendant le rejeu. */
  readonly days: readonly DayRecord[];
};

/** Jours de cases gardés après qu'elles ont été apprises : le temps de juger leur jour civil. */
const KEEP_AFTER_LEARNING_MS = 3 * DAY_MS;
const keyOf = (time: number, lead: number): string => `${time}:${lead}`;

/**
 * Rejoue l'historique d'une ville. `archiveFrom` est la première heure de validité dont les
 * cases sont rendues pour l'archive ; les plus anciennes ne servent qu'à apprendre.
 */
export function replayHistory(cityId: CityId, history: History, archiveFrom: number): Bootstrap {
  const state = emptyCityState(cityId);
  const store = new Map<string, Cell>();
  // L'apprentissage part de la première heure qui a pu recevoir une prévision.
  const firstLearnable = history.firstHour + DAY_MS;
  const cells: CellIndex = {
    at: (time, lead) => store.get(keyOf(time, lead)),
    earliest: firstLearnable,
  };
  const days: DayRecord[] = [];
  const delay = BLEND_CONFIG.observationDelayHours * HOUR_MS;

  for (let issued = history.firstHour; issued <= history.lastHour; issued += HOUR_MS) {
    const until = issued - delay;
    if (until >= firstLearnable) {
      days.push(
        ...advanceLearning(state, { cells, observations: history.observations, until }).days,
      );
    }
    for (let lead = 1; lead <= MAX_LEAD_DAYS; lead += 1) {
      const time = issued + lead * DAY_MS;
      if (time > history.lastHour) break;
      const hour = blendModels(history.modelsAt(time, lead), state, time, lead);
      if (hour !== null) store.set(keyOf(time, lead), toCell(hour));
      // Une case apprise depuis longtemps ne sert plus, sauf si elle part à l'archive.
      const obsolete = until - KEEP_AFTER_LEARNING_MS;
      if (obsolete < archiveFrom) store.delete(keyOf(obsolete, lead));
    }
  }

  state.lastCollectedAt = toInstant(history.lastHour);
  return {
    state: normalizeCityState(state),
    cells: [...store.values()].filter((cell) => cell.time >= archiveFrom),
    days,
  };
}
