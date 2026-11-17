// Ce que l'app a le droit de montrer d'une prévision à un instant donné : rien de passé comme
// à venir, rien d'ancien comme frais. Fonctions pures : l'instant présent leur est passé.

import { strings } from '@/i18n';
import { STALE_FORECAST_AFTER_HOURS } from '@/lib/config';
import type { DataErrorKind } from '@/lib/data';
import { formatDayInParis, formatTimeInParis } from '@/lib/dates';
import { parisDateKey, startOfParisDay } from '@shared/parisTime';
import type { DailyForecast, ForecastFile, HourlyForecast } from '@shared/schemas';

import type { PublishedData } from './hooks/usePublishedFile';

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

/** Âge de la prévision, en heures entières ; une prévision « du futur » (horloge déréglée) a zéro heure. */
export function ageInHours(generatedAt: string, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - Date.parse(generatedAt)) / HOUR_MS));
}

/** Une prévision est ancienne au-delà du seuil, pas à l'instant où elle l'atteint. */
export function isStale(generatedAt: string, now: Date): boolean {
  return now.getTime() - Date.parse(generatedAt) > STALE_FORECAST_AFTER_HOURS * HOUR_MS;
}

/** Les heures à montrer : l'heure en cours, puis les suivantes. */
export function upcomingHours(hourly: readonly HourlyForecast[], now: Date): HourlyForecast[] {
  const currentHour = Math.floor(now.getTime() / HOUR_MS) * HOUR_MS;
  return hourly.filter((hour) => Date.parse(hour.time) >= currentHour);
}

/** Les jours à montrer : aujourd'hui (jour civil de Paris), puis les suivants. */
export function upcomingDays(daily: readonly DailyForecast[], now: Date): DailyForecast[] {
  const today = parisDateKey(now);
  return daily.filter((day) => day.date >= today);
}

/** « Mis à jour à 15 h 02 », « hier à 15 h 02 », ou avec le jour quand c'est plus ancien. */
export function updatedLabel(generatedAt: string, now: Date): string {
  const generated = new Date(generatedAt);
  const time = formatTimeInParis(generated);
  const daysAgo = Math.round(
    (startOfParisDay(parisDateKey(now)).getTime() -
      startOfParisDay(parisDateKey(generated)).getTime()) /
      DAY_MS,
  );
  if (daysAgo <= 0) return strings.freshness.updatedToday(time);
  if (daysAgo === 1) return strings.freshness.updatedYesterday(time);
  return strings.freshness.updatedOn(formatDayInParis(generated), time);
}

/** « 14 heures », ou « 3 jours » au-delà de deux jours. */
export function ageLabel(generatedAt: string, now: Date): string {
  const hours = ageInHours(generatedAt, now);
  const HOURS_SHOWN_AS_DAYS = 48;
  return hours >= HOURS_SHOWN_AS_DAYS
    ? strings.freshness.days(Math.floor(hours / 24))
    : strings.freshness.hours(hours);
}

/** Pourquoi il n'y a rien à afficher. */
export type EmptyReason = DataErrorKind | 'none' | 'expired';

export type ForecastView =
  /** Premier chargement : rien à montrer encore. */
  | { readonly status: 'loading' }
  /** Rien à montrer, et on sait pourquoi. */
  | { readonly status: 'empty'; readonly reason: EmptyReason }
  | {
      readonly status: 'ready';
      readonly forecast: ForecastFile;
      /** L'heure en cours et les suivantes. */
      readonly hours: readonly HourlyForecast[];
      /** Aujourd'hui et les jours suivants : jamais vide. */
      readonly days: readonly [DailyForecast, ...DailyForecast[]];
      readonly updated: string;
      readonly isStale: boolean;
      readonly isRefreshing: boolean;
      /** Le dernier rafraîchissement a échoué : la prévision affichée n'est pas la plus récente. */
      readonly refreshError: DataErrorKind | null;
    };

/** Ce qu'un écran doit montrer d'une prévision, à cet instant. */
export function forecastView(published: PublishedData<ForecastFile>, now: Date): ForecastView {
  const { data, error, isLoading, isRefreshing } = published;
  if (data === null) {
    if (isLoading) return { status: 'loading' };
    return { status: 'empty', reason: error?.kind ?? 'none' };
  }
  const [today, ...nextDays] = upcomingDays(data.daily, now);
  // Une prévision dont tous les jours sont passés n'a plus rien à dire.
  if (today === undefined) return { status: 'empty', reason: error?.kind ?? 'expired' };
  return {
    status: 'ready',
    forecast: data,
    hours: upcomingHours(data.hourly, now),
    days: [today, ...nextDays],
    updated: updatedLabel(data.generatedAt, now),
    isStale: isStale(data.generatedAt, now),
    isRefreshing,
    refreshError: error?.kind ?? null,
  };
}
