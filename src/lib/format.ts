// Formats de nombres à la française, pour toute l'app : virgule décimale, espace insécable
// avant « % » et avant les unités, « ° » collé au chiffre, vrai signe moins. Une valeur
// absente s'écrit « — » : on n'affiche jamais un chiffre qu'on n'a pas.

import { strings } from '@/i18n';

const NBSP = ' ';
const MINUS = '−';

type MaybeNumber = number | null | undefined;

function isMissing(value: MaybeNumber): value is null | undefined {
  return value === null || value === undefined || !Number.isFinite(value);
}

/** Nombre avec virgule décimale et vrai signe moins ; un nombre qui s'arrondit à zéro n'a pas de signe. */
export function formatNumber(value: MaybeNumber, digits = 0): string {
  if (isMissing(value)) return strings.common.missing;
  const magnitude = Math.abs(value).toFixed(digits);
  const isNegative = value < 0 && Number(magnitude) !== 0;
  return `${isNegative ? MINUS : ''}${magnitude.replace('.', ',')}`;
}

/** Température : « 16° », « 16,8° », « −2° ». */
export function formatTemperature(value: MaybeNumber, digits = 0): string {
  return isMissing(value) ? strings.common.missing : `${formatNumber(value, digits)}°`;
}

/** Pourcentage à partir d'un nombre de 0 à 100 : « 95 % ». */
export function formatPercent(value: MaybeNumber): string {
  return isMissing(value) ? strings.common.missing : `${formatNumber(value)}${NBSP}%`;
}

/** Vitesse du vent : « 35 km/h ». */
export function formatSpeed(value: MaybeNumber): string {
  return isMissing(value) ? strings.common.missing : `${formatNumber(value)}${NBSP}km/h`;
}

/** Cumul de pluie : « 12 mm », « 0,4 mm ». */
export function formatMillimetres(value: MaybeNumber): string {
  if (isMissing(value)) return strings.common.missing;
  const digits = value !== 0 && Math.abs(value) < 1 ? 1 : 0;
  return `${formatNumber(value, digits)}${NBSP}mm`;
}

/** Heure ronde : « 17 h ». */
export function formatHour(hour: MaybeNumber): string {
  return isMissing(hour) ? strings.common.missing : `${formatNumber(hour)}${NBSP}h`;
}
