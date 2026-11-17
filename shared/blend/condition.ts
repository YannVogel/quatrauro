// Condition météo d'une heure et d'un jour, déduite des champs mélangés par des règles
// lisibles (docs/features/conditions-et-resumes.md). La pluie y suit l'annonce de pluie : une
// heure ou un jour « de pluie » est celui dont la probabilité atteint le seuil d'annonce, le
// même que celui que l'indice de fiabilité juge.

import type { Condition } from '../conditions.ts';

/** Codes météo de l'OMM qu'Open-Meteo rend pour un orage (95, 97), avec grêle (96, 99). */
const THUNDERSTORM_CODES: readonly number[] = [95, 96, 97, 99];

const WET_CONDITIONS: readonly Condition[] = ['rain', 'showers', 'thunderstorm', 'snow'];

export const isWet = (condition: Condition | null): boolean =>
  condition !== null && WET_CONDITIONS.includes(condition);

/**
 * Vrai quand une majorité stricte des modèles qui donnent un code météo annoncent un orage.
 * L'orage ne se déduit d'aucun champ mélangé : c'est le seul recours aux codes des modèles.
 */
export function announcesThunderstorm(weatherCodes: readonly (number | null)[]): boolean {
  const codes = weatherCodes.filter((code): code is number => code !== null);
  const announcing = codes.filter((code) => THUNDERSTORM_CODES.includes(code)).length;
  return announcing * 2 > codes.length;
}

export type ConditionSettings = {
  /** Probabilité à partir de laquelle on annonce de la pluie dans l'heure, de 0 à 1. */
  readonly hourlyAnnouncement: number;
  /** Probabilité à partir de laquelle on annonce un jour de pluie, de 0 à 1. */
  readonly dailyAnnouncement: number;
  readonly clearBelow: number;
  readonly cloudyFrom: number;
  readonly strongWind: number;
  readonly strongGusts: number;
  readonly snowUpTo: number;
  readonly lastingRainHours: number;
  readonly windyHours: number;
};

export type ConditionHour = {
  /** Nébulosité, en %. */
  readonly cloudCover: number | null;
  /** Probabilité de pluie dans l'heure, de 0 à 1. */
  readonly precipitationProbability: number | null;
  readonly temperature: number | null;
  readonly windSpeed: number | null;
  readonly windGusts: number | null;
  /** Une majorité de modèles annonce un orage à cette heure. */
  readonly thunderstorm: boolean;
};

function skyCondition(cloudCover: number | null, settings: ConditionSettings): Condition | null {
  if (cloudCover === null) return null;
  if (cloudCover < settings.clearBelow) return 'clear';
  return cloudCover < settings.cloudyFrom ? 'partlyCloudy' : 'cloudy';
}

const reaches = (value: number | null, threshold: number): boolean =>
  value !== null && value >= threshold;

/**
 * Condition d'une heure. Sans probabilité de pluie, on ne sait pas dire s'il pleut : pas de
 * condition. Dans l'ordre : pluie (orage, neige, averses, pluie), vent fort, puis le ciel.
 */
export function hourCondition(hour: ConditionHour, settings: ConditionSettings): Condition | null {
  if (hour.precipitationProbability === null) return null;
  if (hour.precipitationProbability >= settings.hourlyAnnouncement) {
    if (hour.thunderstorm) return 'thunderstorm';
    if (hour.temperature !== null && hour.temperature <= settings.snowUpTo) return 'snow';
    // Entre deux averses, le ciel se découvre : sous un ciel couvert, c'est de la pluie.
    return hour.cloudCover !== null && hour.cloudCover < settings.cloudyFrom ? 'showers' : 'rain';
  }
  if (
    reaches(hour.windSpeed, settings.strongWind) ||
    reaches(hour.windGusts, settings.strongGusts)
  ) {
    return 'windy';
  }
  return skyCondition(hour.cloudCover, settings);
}

/** Une heure du jour, avec sa condition déjà calculée. */
export type DayHour = {
  readonly condition: Condition | null;
  readonly cloudCover: number | null;
  readonly isNight: boolean;
};

const count = <Item>(items: readonly Item[], test: (item: Item) => boolean): number =>
  items.filter(test).length;

/**
 * Condition d'un jour, par dominance. C'est la probabilité de pluie du jour qui dit s'il est
 * sec ou pluvieux : un jour sec n'est jamais « Pluie », un jour de pluie n'est jamais « Ciel
 * dégagé ». Le ciel et le vent se jugent sur les heures de jour.
 */
export function dayCondition(
  day: {
    /** Probabilité d'un jour de pluie, de 0 à 1. */
    readonly precipitationProbability: number | null;
    readonly hours: readonly DayHour[];
  },
  settings: ConditionSettings,
): Condition | null {
  if (day.precipitationProbability === null) return null;

  if (day.precipitationProbability >= settings.dailyAnnouncement) {
    const wetHours = day.hours.filter((hour) => isWet(hour.condition));
    if (wetHours.some((hour) => hour.condition === 'thunderstorm')) return 'thunderstorm';
    const snowHours = count(wetHours, (hour) => hour.condition === 'snow');
    if (snowHours > 0 && snowHours * 2 >= wetHours.length) return 'snow';
    return wetHours.length >= settings.lastingRainHours ? 'rain' : 'showers';
  }

  const daytime = day.hours.filter((hour) => !hour.isNight);
  if (count(daytime, (hour) => hour.condition === 'windy') >= settings.windyHours) return 'windy';
  const cloudCovers = daytime.flatMap((hour) =>
    hour.cloudCover === null ? [] : [hour.cloudCover],
  );
  if (cloudCovers.length === 0) return null;
  const mean = cloudCovers.reduce((total, value) => total + value, 0) / cloudCovers.length;
  return skyCondition(mean, settings);
}
