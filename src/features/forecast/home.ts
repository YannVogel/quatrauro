// Ce que l'accueil affiche, tiré d'une prévision prête : le temps de l'heure en cours, les
// prochaines heures, la semaine. Fonctions pures, sans rien d'écran.

import { strings } from '@/i18n';
import { UPCOMING_HOURS_COUNT } from '@/lib/config';
import { formatInParis } from '@/lib/dates';
import { BLEND_CONFIG } from '@shared/blendConfig';
import type { Condition } from '@shared/conditions';
import { parisHour, startOfParisDay } from '@shared/parisTime';
import type { DailyForecast, HourlyForecast } from '@shared/schemas';

const HOUR_MS = 3_600_000;
const PERCENT = 100;
/** Le risque de pluie s'affiche dès qu'une des prochaines heures atteint le seuil d'annonce. */
const RAIN_SHOWN_FROM = BLEND_CONFIG.rain.hourlyAnnouncement * PERCENT;

const capitalized = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

/** Midi du jour civil : un instant sûr pour nommer le jour, loin des changements d'heure. */
const noonOf = (date: string): Date => new Date(startOfParisDay(date).getTime() + 12 * HOUR_MS);

/** « Mar. », le jour abrégé d'une date `AAAA-MM-JJ`. */
export const shortDayOf = (date: string): string => capitalized(formatInParis(noonOf(date), 'EEE'));
/** « mardi », le jour en toutes lettres. */
export const spokenDayOf = (date: string): string => formatInParis(noonOf(date), 'EEEE');
/** « Mardi 17 novembre ». */
export const longDayOf = (date: string): string =>
  capitalized(formatInParis(noonOf(date), 'EEEE d MMMM'));

export type HomeHero = {
  readonly temperature: number | null;
  readonly condition: Condition | null;
  readonly isNight: boolean;
  readonly windSpeed: number | null;
  /** Le jour d'aujourd'hui, en toutes lettres : « Mardi 17 novembre ». */
  readonly day: string;
  /** Indice de fiabilité du jour, de 0 à 100. */
  readonly reliability: number | null;
  /** « 4 modèles d'accord », ou `null` quand on ne sait pas. */
  readonly agreement: string | null;
};

export type HomeHour = {
  readonly time: string;
  /** Heure de Paris, de 0 à 23. */
  readonly hour: number;
  readonly temperature: number | null;
  /** Absent quand aucune des prochaines heures n'annonce de pluie. */
  readonly rainProbability?: number | null;
};

export type HomeDay = {
  readonly date: string;
  readonly dayLabel: string;
  readonly spokenDay: string;
  readonly condition: Condition | null;
  readonly min: number | null;
  readonly max: number | null;
  readonly reliability: number | null;
};

export type HomeContent = {
  readonly hero: HomeHero;
  readonly hours: readonly HomeHour[];
  readonly week: readonly HomeDay[];
  /** Échelle commune aux barres d'amplitude de la semaine. */
  readonly scale: { readonly min: number; readonly max: number };
};

function heroOf(current: HourlyForecast | undefined, today: DailyForecast): HomeHero {
  const { modelsAgreeing, modelsTotal } = today;
  return {
    temperature: current?.temperature ?? null,
    condition: current?.condition ?? null,
    isNight: current?.isNight ?? false,
    windSpeed: current?.windSpeed ?? null,
    day: longDayOf(today.date),
    reliability: today.reliability,
    agreement:
      modelsAgreeing === null || modelsTotal === 0
        ? null
        : strings.home.agreement(modelsAgreeing, modelsTotal),
  };
}

function hoursOf(next: readonly HourlyForecast[]): HomeHour[] {
  const showRain = next.some(
    (hour) =>
      hour.precipitationProbability !== null && hour.precipitationProbability >= RAIN_SHOWN_FROM,
  );
  return next.map((hour) => ({
    time: hour.time,
    hour: parisHour(new Date(hour.time)),
    temperature: hour.temperature,
    ...(showRain ? { rainProbability: hour.precipitationProbability } : {}),
  }));
}

function scaleOf(days: readonly DailyForecast[]): { min: number; max: number } {
  const values = days.flatMap((day) => [day.min, day.max]).filter((value) => value !== null);
  // Sans aucune température, les barres n'ont rien à montrer : l'échelle est sans importance.
  return values.length === 0
    ? { min: 0, max: 1 }
    : { min: Math.min(...values), max: Math.max(...values) };
}

/**
 * Le contenu de l'accueil. `hours` commence à l'heure en cours : elle va dans le bloc d'état,
 * les suivantes dans les vignettes. `days` commence à aujourd'hui et n'est jamais vide.
 */
export function homeContent(
  hours: readonly HourlyForecast[],
  days: readonly [DailyForecast, ...DailyForecast[]],
): HomeContent {
  const [current, ...next] = hours;
  return {
    hero: heroOf(current, days[0]),
    hours: hoursOf(next.slice(0, UPCOMING_HOURS_COUNT)),
    week: days.map((day) => ({
      date: day.date,
      dayLabel: shortDayOf(day.date),
      spokenDay: spokenDayOf(day.date),
      condition: day.condition,
      min: day.min,
      max: day.max,
      reliability: day.reliability,
    })),
    scale: scaleOf(days),
  };
}
