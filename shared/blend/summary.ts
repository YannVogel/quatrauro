// Résumé d'un jour : au plus une phrase courte, choisie par des règles dans la table de
// textes (docs/features/conditions-et-resumes.md). Les heures citées sont celles de Paris.

import type { Condition } from '../conditions.ts';
import { parisHour } from '../parisTime.ts';
import { SUMMARY_TEXTS } from '../texts/fr.ts';
import { isWet } from './condition.ts';

export type SummarySettings = {
  readonly clearBelow: number;
  readonly cloudyFrom: number;
  readonly strongGusts: number;
  readonly morningFrom: number;
  readonly afternoonFrom: number;
  readonly eveningFrom: number;
  readonly mostOfDayHours: number;
  readonly earlyUntil: number;
  readonly lateFrom: number;
};

export type SummaryHour = {
  /** Heure ronde, en UTC, au format ISO. */
  readonly time: string;
  readonly condition: Condition | null;
  readonly cloudCover: number | null;
};

export type SummaryDay = {
  readonly condition: Condition | null;
  /** Rafales les plus fortes du jour, en km/h. */
  readonly windGustsMax: number | null;
  /** Les heures du jour civil de Paris. */
  readonly hours: readonly SummaryHour[];
};

const RAINY_DAYS: readonly Condition[] = ['rain', 'showers', 'thunderstorm'];

function rainSummary(day: SummaryDay, settings: SummarySettings): string {
  const hourOf = (hour: SummaryHour): number => parisHour(new Date(hour.time));
  const thunderstorm = day.hours.find((hour) => hour.condition === 'thunderstorm');
  if (thunderstorm !== undefined) return SUMMARY_TEXTS.thunderstormAround(hourOf(thunderstorm));

  const wetHours = day.hours.filter((hour) => isWet(hour.condition)).map(hourOf);
  // Les modèles annoncent de la pluie dans la journée sans s'accorder sur l'heure.
  if (wetHours.length === 0) return SUMMARY_TEXTS.rainRisk;
  const first = Math.min(...wetHours);
  const last = Math.max(...wetHours);

  if (first === last) return SUMMARY_TEXTS.showerAround(first);
  if (first >= settings.eveningFrom) return SUMMARY_TEXTS.dryMorningWetEvening;
  // Plus d'heures sèches que d'heures de pluie entre la première et la dernière : des averses.
  const isScattered = wetHours.length * 2 < last - first + 1;
  if (isScattered) return SUMMARY_TEXTS.showersBetween(first, last);
  if (first <= settings.earlyUntil && last < settings.eveningFrom) {
    return SUMMARY_TEXTS.rainUntil(last);
  }
  if (first > settings.earlyUntil && last >= settings.lateFrom)
    return SUMMARY_TEXTS.rainFrom(first);
  if (wetHours.length >= settings.mostOfDayHours) return SUMMARY_TEXTS.rainMostOfDay;
  return SUMMARY_TEXTS.rainBetween(first, last);
}

type Sky = 'sunny' | 'cloudy' | 'mixed';

/** Ciel moyen entre deux heures de Paris (`from` comprise, `to` exclue). */
function skyBetween(
  hours: readonly SummaryHour[],
  from: number,
  to: number,
  settings: SummarySettings,
): Sky | null {
  const cloudCovers = hours.flatMap((hour) => {
    const at = parisHour(new Date(hour.time));
    return hour.cloudCover === null || at < from || at >= to ? [] : [hour.cloudCover];
  });
  if (cloudCovers.length === 0) return null;
  const mean = cloudCovers.reduce((total, value) => total + value, 0) / cloudCovers.length;
  if (mean < settings.clearBelow) return 'sunny';
  return mean >= settings.cloudyFrom ? 'cloudy' : 'mixed';
}

function drySummary(day: SummaryDay, settings: SummarySettings): string | null {
  if (day.windGustsMax !== null && day.windGustsMax >= settings.strongGusts) {
    return SUMMARY_TEXTS.gustsUpTo(Math.round(day.windGustsMax));
  }
  const morning = skyBetween(day.hours, settings.morningFrom, settings.afternoonFrom, settings);
  const afternoon = skyBetween(day.hours, settings.afternoonFrom, settings.eveningFrom, settings);
  if (morning === 'sunny' && afternoon === 'cloudy') {
    return SUMMARY_TEXTS.sunnyMorningCloudyAfternoon;
  }
  if (morning === 'cloudy' && afternoon === 'sunny') {
    return SUMMARY_TEXTS.cloudyMorningSunnyAfternoon;
  }
  return null;
}

/**
 * Phrase du jour, ou `null` quand il n'y a rien à ajouter à la condition. Un jour sans
 * condition n'a pas de résumé ; un jour de neige non plus (les phrases parlent de pluie).
 */
export function daySummary(day: SummaryDay, settings: SummarySettings): string | null {
  if (day.condition === null || day.condition === 'snow') return null;
  return RAINY_DAYS.includes(day.condition)
    ? rainSummary(day, settings)
    : drySummary(day, settings);
}
