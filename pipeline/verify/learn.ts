// Vérification : dès qu'une heure est assez ancienne pour que sa mesure soit publiée, on
// compare ce qui avait été prévu pour elle, à chaque échéance, à ce qui a été mesuré, et on
// met à jour ce que l'on sait de chaque modèle. Les heures sont apprises dans l'ordre, une
// seule fois, comme dans le backtest : une heure dont la mesure manque à ce moment-là est
// passée et ne sera pas reprise.

import { updateBias } from '../../shared/blend/bias.ts';
import { rainAgreement, rainProbability, updateRainCalibration } from '../../shared/blend/rain.ts';
import { updateReliability } from '../../shared/blend/reliability.ts';
import { updateError } from '../../shared/blend/weights.ts';
import { BLEND_CONFIG, MAX_LEAD_DAYS } from '../../shared/blendConfig.ts';
import type { ModelId } from '../../shared/models.ts';
import { parisDateKey, parisDayLengthHours, startOfParisDay } from '../../shared/parisTime.ts';
import { CORRECTED_VARIABLES } from '../../shared/variables.ts';
import type { Cell, CellIndex } from '../archive/forecasts.ts';
import type { Measures, ObservationIndex } from '../archive/observations.ts';
import { ARCHIVE_DECIMALS, roundTo } from '../config.ts';
import { HOUR_MS, floorToHour, hourNumberOf, toInstant } from '../instant.ts';
import { bucketOf, modelStateOf, setModelState } from '../state/cityState.ts';
import type { CityState } from '../state/cityState.ts';

const { corrected: CORRECTED, rain: RAIN, reliability: RELIABILITY } = BLEND_CONFIG;
const RAIN_OPTIONS = { priorStrength: RAIN.priorStrength, minSamples: RAIN.minSamples };
const LEADS = Array.from({ length: MAX_LEAD_DAYS }, (_, index) => index + 1);

/** Ce qui avait été prévu pour un jour à une échéance, et ce qui s'est passé. */
export type DayRecord = {
  /** Jour civil de Paris. */
  readonly date: string;
  readonly lead: number;
  readonly forecastMin: number | null;
  readonly forecastMax: number | null;
  /** Écart-type moyen entre modèles sur la journée. */
  readonly spread: number | null;
  /** Probabilité d'un jour de pluie, de 0 à 1. */
  readonly rainProbability: number | null;
  readonly observedMin: number | null;
  readonly observedMax: number | null;
  /** Cumul mesuré, en mm. */
  readonly observedRain: number | null;
  /** L'annonce de pluie (oui ou non) était juste ; `null` si elle n'est pas vérifiable. */
  readonly rainHeld: boolean | null;
  /** Minimum, maximum et annonce de pluie tenus ; `null` si le jour n'est pas vérifiable. */
  readonly held: boolean | null;
};

function learnHour(state: CityState, time: number, cells: CellIndex, observed: Measures): void {
  const hour = hourNumberOf(time);
  const utcHour = new Date(time).getUTCHours();
  for (const lead of LEADS) {
    const cell = cells.at(time, lead);
    const bucket = bucketOf(lead);
    if (cell === undefined || bucket === null) continue;

    for (const [modelId, model] of Object.entries(cell.models) as [
      ModelId,
      Cell['models'][ModelId],
    ][]) {
      if (model === undefined) continue;
      for (const variable of CORRECTED_VARIABLES) {
        const observation = observed[variable];
        const raw = model.raw[variable];
        if (observation === null || raw === null) continue;
        const slot = { variable, modelId, bucket, utcHour };
        const current = modelStateOf(state, slot);
        setModelState(state, slot, {
          bias: updateBias(current.bias, raw, observation, hour, CORRECTED.biasHalfLifeDays),
          error: updateError(
            current.error,
            model.corrected[variable],
            observation,
            hour,
            CORRECTED.errorHalfLifeDays,
          ),
        });
      }
    }

    const calibration = state.hourlyRain[bucket];
    const amounts = Object.values(cell.models).flatMap((model) =>
      model?.raw.precipitation === null || model === undefined ? [] : [model.raw.precipitation],
    );
    const agreement = rainAgreement(amounts, RAIN.hourlyThreshold);
    if (observed.precipitation === null || agreement === null || calibration === undefined)
      continue;
    state.hourlyRain[bucket] = updateRainCalibration(
      calibration,
      agreement,
      observed.precipitation >= RAIN.hourlyThreshold,
    );
  }
}

const complete = (values: readonly (number | null)[]): values is number[] =>
  values.length > 0 && values.every((value) => value !== null);
const sum = (values: readonly number[]): number =>
  values.reduce((total, value) => total + value, 0);
const rounded = (value: number | null): number | null =>
  value === null ? null : roundTo(value, ARCHIVE_DECIMALS);

/** Heures d'un jour civil de Paris, en millisecondes. */
export function hoursOfParisDay(date: string): number[] {
  const start = startOfParisDay(date).getTime();
  return Array.from({ length: parisDayLengthHours(date) }, (_, index) => start + index * HOUR_MS);
}

/** Jour civil de Paris qui suit `date`. */
export const nextParisDay = (date: string): string =>
  parisDateKey(new Date(startOfParisDay(date).getTime() + 36 * HOUR_MS));

type Assessment = { readonly record: DayRecord; readonly agreement: number | null };

/**
 * Juge un jour à une échéance, sans rien apprendre. Un minimum, un maximum ou un cumul ne se
 * calcule que sur un jour complet : il suffit d'une heure manquante pour qu'il vaille `null`.
 */
function assessDay(
  state: CityState,
  date: string,
  lead: number,
  cells: readonly (Cell | undefined)[],
  observed: readonly (Measures | undefined)[],
): Assessment {
  const temperatures = observed.map((measures) => measures?.temperature ?? null);
  const rains = observed.map((measures) => measures?.precipitation ?? null);
  const observedMin = complete(temperatures) ? Math.min(...temperatures) : null;
  const observedMax = complete(temperatures) ? Math.max(...temperatures) : null;
  const observedRain = complete(rains) ? sum(rains) : null;

  const blended = cells.map((cell) => cell?.blend.temperature ?? null);
  const spreads = cells.map((cell) => cell?.blend.temperatureSpread ?? null);
  const forecastMin = complete(blended) ? Math.min(...blended) : null;
  const forecastMax = complete(blended) ? Math.max(...blended) : null;
  const spread = complete(spreads) ? sum(spreads) / spreads.length : null;

  const modelIds = [...new Set(cells.flatMap((cell) => Object.keys(cell?.models ?? {})))];
  const dailyAmounts = modelIds.flatMap((modelId) => {
    const amounts = cells.map(
      (cell) => cell?.models[modelId as ModelId]?.raw.precipitation ?? null,
    );
    return complete(amounts) ? [sum(amounts)] : [];
  });
  const agreement = rainAgreement(dailyAmounts, RAIN.dailyThreshold);
  const calibration = state.dailyRain[bucketOf(lead) ?? -1];
  const probability =
    agreement === null || calibration === undefined
      ? null
      : rainProbability(calibration, agreement, RAIN_OPTIONS);

  const rained = observedRain === null ? null : observedRain >= RAIN.dailyThreshold;
  const rainHeld =
    probability === null || rained === null
      ? null
      : probability >= RAIN.dailyAnnouncement === rained;
  const temperatureHeld =
    forecastMin === null || forecastMax === null || observedMin === null || observedMax === null
      ? null
      : Math.abs(forecastMax - observedMax) <= RELIABILITY.temperatureTolerance &&
        Math.abs(forecastMin - observedMin) <= RELIABILITY.temperatureTolerance;

  return {
    agreement,
    record: {
      date,
      lead,
      forecastMin,
      forecastMax,
      spread: rounded(spread),
      rainProbability: rounded(probability),
      observedMin,
      observedMax,
      observedRain: rounded(observedRain),
      rainHeld,
      held: rainHeld === null || temperatureHeld === null ? null : rainHeld && temperatureHeld,
    },
  };
}

function learnDay(
  state: CityState,
  date: string,
  cells: CellIndex,
  observations: ObservationIndex,
): DayRecord[] {
  const hours = hoursOfParisDay(date);
  const observed = hours.map((time) => observations.get(time));
  // Toutes les échéances sont jugées avec ce que l'on savait avant ce jour, puis on apprend.
  const assessments = LEADS.flatMap((lead) => {
    const dayCells = hours.map((time) => cells.at(time, lead));
    return dayCells.every((cell) => cell === undefined)
      ? []
      : [assessDay(state, date, lead, dayCells, observed)];
  });

  for (const { record, agreement } of assessments) {
    const bucket = bucketOf(record.lead);
    if (bucket === null) continue;
    const calibration = state.dailyRain[bucket];
    if (agreement !== null && record.observedRain !== null && calibration !== undefined) {
      state.dailyRain[bucket] = updateRainCalibration(
        calibration,
        agreement,
        record.observedRain >= RAIN.dailyThreshold,
      );
    }
    const table = state.reliability[bucket];
    if (
      record.held !== null &&
      record.spread !== null &&
      record.rainProbability !== null &&
      table !== undefined
    ) {
      state.reliability[bucket] = updateReliability(
        table,
        // Le nombre de modèles ne joue pas dans la table : seul le plafond de l'indice le lit.
        { spread: record.spread, rainProbability: record.rainProbability, modelCount: 0 },
        record.held,
        RELIABILITY,
      );
    }
  }
  return assessments.map(({ record }) => record);
}

export type Learning = {
  readonly state: CityState;
  /** Jours jugés pendant ce passage, toutes échéances confondues. */
  readonly days: readonly DayRecord[];
  readonly hoursLearned: number;
  /** Heures passées sans mesure : elles ne seront pas reprises. */
  readonly hoursWithoutObservation: number;
};

/**
 * Apprend toutes les heures jusqu'à `until` (comprise) qui ne l'ont pas encore été, puis juge
 * les jours civils de Paris devenus complets. L'état reçu n'est pas modifié.
 */
export function learn(
  state: CityState,
  input: {
    readonly cells: CellIndex;
    readonly observations: ObservationIndex;
    readonly until: number;
  },
): Learning {
  const next = structuredClone(state);
  const { cells, observations } = input;
  const start =
    next.learnedThrough === null ? cells.earliest : Date.parse(next.learnedThrough) + HOUR_MS;
  const until = floorToHour(input.until);
  if (start === null || start > until) {
    return { state: next, days: [], hoursLearned: 0, hoursWithoutObservation: 0 };
  }

  let hoursLearned = 0;
  let hoursWithoutObservation = 0;
  for (let time = start; time <= until; time += HOUR_MS) {
    const observed = observations.get(time);
    if (observed === undefined) hoursWithoutObservation += 1;
    else {
      learnHour(next, time, cells, observed);
      hoursLearned += 1;
    }
  }
  next.learnedThrough = toInstant(until);

  const days: DayRecord[] = [];
  let date =
    next.learnedDayThrough === null
      ? parisDateKey(new Date(start))
      : nextParisDay(next.learnedDayThrough);
  while ((hoursOfParisDay(date).at(-1) ?? Number.POSITIVE_INFINITY) <= until) {
    days.push(...learnDay(next, date, cells, observations));
    next.learnedDayThrough = date;
    date = nextParisDay(date);
  }
  return { state: next, days, hoursLearned, hoursWithoutObservation };
}
