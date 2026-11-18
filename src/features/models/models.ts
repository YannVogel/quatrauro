// Ce que montre l'écran « Les modèles » pour un jour : la prévision combinée de l'après-midi,
// ce que dit chaque modèle, son poids dans le mélange et son erreur récente. Fonctions pures :
// tout vient des deux fichiers publiés, rien n'est recalculé.

import { shortDayOf, longDayOf } from '@/features/forecast';
import { strings } from '@/i18n';
import { MODELS_REFERENCE_HOUR } from '@/lib/config';
import { MAX_LEAD_DAYS } from '@shared/blendConfig';
import { MODELS } from '@shared/models';
import type { ModelId } from '@shared/models';
import { parisDateKey, parisHour, startOfParisDay } from '@shared/parisTime';
import type {
  DailyForecast,
  ForecastFile,
  HourlyForecast,
  VerificationFile,
} from '@shared/schemas';

const DAY_MS = 86_400_000;
const PERCENT = 100;

/** Pourquoi un modèle n'a pas de valeur. */
export type ModelStatus = 'present' | 'outOfRange' | 'absent';

export type ModelLine = {
  readonly id: ModelId;
  readonly name: string;
  readonly provider: string;
  readonly status: ModelStatus;
  /** Température prévue par ce modèle à l'heure comparée, corrigée de son biais. */
  readonly temperature: number | null;
  /** Poids moyen dans la température du jour, de 0 à 1, arrondi au pour cent ; `null` s'il ne pèse pas. */
  readonly weight: number | null;
};

export type ModelsDayOption = {
  readonly date: string;
  /** « Auj. », « Dem. », « Jeu. ». */
  readonly label: string;
};

export type ModelErrors = {
  /** Échéance des scores, en jours. */
  readonly lead: number;
  /** Nombre de jours de la période des scores. */
  readonly periodDays: number;
  readonly blend: number | null;
  readonly models: readonly {
    readonly id: ModelId;
    readonly name: string;
    readonly error: number;
  }[];
};

export type ModelsContent = {
  readonly days: readonly ModelsDayOption[];
  readonly date: string;
  /** « Demain, 15 h ». */
  readonly moment: string;
  readonly combined: number | null;
  /** Écart entre le modèle le plus chaud et le plus frais ; `null` avec moins de deux modèles. */
  readonly spread: number | null;
  readonly lines: readonly ModelLine[];
  /** `null` tant qu'aucun score n'existe pour cette échéance. */
  readonly errors: ModelErrors | null;
};

const rankOf = (date: string, today: string): number =>
  Math.round((startOfParisDay(date).getTime() - startOfParisDay(today).getTime()) / DAY_MS);

function dayName(date: string, today: string, short: boolean): string {
  const { models } = strings;
  const rank = rankOf(date, today);
  if (rank === 0) return short ? models.shortToday : models.today;
  if (rank === 1) return short ? models.shortTomorrow : models.tomorrow;
  return short ? shortDayOf(date) : longDayOf(date);
}

/** L'heure du jour la plus proche de l'heure de référence (elle peut manquer en bout de prévision). */
function referenceHourOf(hours: readonly HourlyForecast[]): HourlyForecast | null {
  const distance = (hour: HourlyForecast): number =>
    Math.abs(parisHour(new Date(hour.time)) - MODELS_REFERENCE_HOUR);
  return hours.reduce<HourlyForecast | null>(
    (closest, hour) => (closest === null || distance(hour) < distance(closest) ? hour : closest),
    null,
  );
}

/**
 * Pourcentages entiers dont la somme vaut exactement 100 : chaque poids est arrondi vers le
 * bas, puis les points restants vont aux plus gros restes. Sans cela, trois poids d'un tiers
 * afficheraient 33 %, 33 % et 33 %.
 */
export function wholePercents(weights: readonly number[]): number[] {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) return weights.map(() => 0);
  const exact = weights.map((weight) => (weight / total) * PERCENT);
  const floors = exact.map(Math.floor);
  const missing = PERCENT - floors.reduce((sum, value) => sum + value, 0);
  const byRemainder = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  byRemainder.slice(0, missing).forEach(({ index }) => {
    floors[index] = (floors[index] ?? 0) + 1;
  });
  return floors;
}

function linesOf(
  forecast: ForecastFile,
  day: DailyForecast,
  hour: HourlyForecast | null,
): ModelLine[] {
  const weighted = MODELS.filter((model) => (day.weights[model.id] ?? 0) > 0);
  const percents = wholePercents(weighted.map((model) => day.weights[model.id] ?? 0));
  const lines = MODELS.map((model): ModelLine => {
    const isAvailable = forecast.models.find((entry) => entry.id === model.id)?.available ?? false;
    const temperature = hour?.models[model.id]?.temperature ?? null;
    const weightIndex = weighted.indexOf(model);
    return {
      id: model.id,
      name: model.name,
      provider: model.provider,
      status: !isAvailable ? 'absent' : temperature === null ? 'outOfRange' : 'present',
      temperature,
      weight: weightIndex === -1 ? null : (percents[weightIndex] ?? 0) / PERCENT,
    };
  });
  // Les plus lourds d'abord ; ceux qui ne pèsent pas ferment la liste.
  return lines.sort((a, b) => (b.weight ?? -1) - (a.weight ?? -1));
}

function errorsOf(verification: VerificationFile | null, lead: number): ModelErrors | null {
  const score = verification?.temperature.byLead.find((entry) => entry.leadDays === lead);
  const period = verification?.period;
  if (score === undefined || period === null || period === undefined) return null;
  return {
    lead,
    periodDays: rankOf(period.to, period.from) + 1,
    blend: score.blend,
    models: MODELS.flatMap((model) => {
      const error = score.models[model.id];
      return error === null || error === undefined
        ? []
        : [{ id: model.id, name: model.name, error }];
    }).sort((a, b) => a.error - b.error),
  };
}

/** Le jour montré par défaut : demain, ou aujourd'hui s'il n'y a pas de lendemain. */
export function defaultModelsDate(days: readonly DailyForecast[]): string | null {
  return (days[1] ?? days[0])?.date ?? null;
}

/**
 * Contenu de l'écran pour un jour à venir. `days` commence à aujourd'hui. `null` si `date`
 * n'est pas un de ces jours.
 */
export function modelsContent(
  forecast: ForecastFile,
  verification: VerificationFile | null,
  days: readonly DailyForecast[],
  date: string,
  now: Date,
): ModelsContent | null {
  const today = parisDateKey(now);
  const day = days.find((candidate) => candidate.date === date);
  if (day === undefined) return null;
  const hour = referenceHourOf(
    forecast.hourly.filter((entry) => parisDateKey(new Date(entry.time)) === date),
  );
  const temperatures = MODELS.flatMap((model) => {
    const value = hour?.models[model.id]?.temperature ?? null;
    return value === null ? [] : [value];
  });
  // L'échéance d'un jour est son rang, comme dans le pipeline : aujourd'hui 1, demain 2…
  const lead = Math.min(rankOf(date, today) + 1, MAX_LEAD_DAYS);
  const hourLabel = hour === null ? strings.common.missing : `${parisHour(new Date(hour.time))} h`;

  return {
    days: days.map((entry) => ({ date: entry.date, label: dayName(entry.date, today, true) })),
    date,
    moment: strings.models.moment(dayName(date, today, false), hourLabel),
    combined: hour?.temperature ?? null,
    spread: temperatures.length < 2 ? null : Math.max(...temperatures) - Math.min(...temperatures),
    lines: linesOf(forecast, day, hour),
    errors: errorsOf(verification, lead),
  };
}
