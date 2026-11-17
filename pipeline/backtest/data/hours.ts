// Axe horaire commun aux prévisions et aux observations : des heures UTC consécutives.
// Une valeur absente est `NaN` dans les séries du backtest, jamais une valeur par défaut.

const HOUR_MS = 3_600_000;
export const HOURS_PER_DAY = 24;

export type HourAxis = {
  /** Première heure de l'axe, en heures depuis l'époque Unix. */
  readonly startHour: number;
  readonly length: number;
};

// `Date.parse` accepte des chaînes fantaisistes : le format est vérifié avant toute lecture.
const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;
const OPEN_METEO_TIME_FORMAT = /^\d{4}-\d{2}-\d{2}T\d{2}:00$/;
const METEO_FRANCE_TIME_FORMAT = /^\d{10}$/;

function hourOfIso(iso: string, source: string): number {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) throw new Error(`${source} invalide : ${iso}`);
  return ms / HOUR_MS;
}

/** Heures depuis l'époque Unix du début d'un jour UTC (`AAAA-MM-JJ`). */
export function hourOfDate(date: string): number {
  if (!DATE_FORMAT.test(date)) throw new Error(`Date invalide : ${date}`);
  return hourOfIso(`${date}T00:00:00Z`, 'Date');
}

/** Heures depuis l'époque Unix d'une heure UTC au format d'Open-Meteo (`AAAA-MM-JJTHH:00`). */
export function hourOfOpenMeteoTime(time: string): number {
  if (!OPEN_METEO_TIME_FORMAT.test(time)) throw new Error(`Heure Open-Meteo invalide : ${time}`);
  return hourOfIso(`${time}:00Z`, 'Heure Open-Meteo');
}

/** Heures depuis l'époque Unix d'une heure UTC au format de Météo-France (`AAAAMMJJHH`). */
export function hourOfMeteoFranceTime(time: string): number {
  if (!METEO_FRANCE_TIME_FORMAT.test(time))
    throw new Error(`Heure Météo-France invalide : ${time}`);
  return hourOfIso(
    `${time.slice(0, 4)}-${time.slice(4, 6)}-${time.slice(6, 8)}T${time.slice(8, 10)}:00:00Z`,
    'Heure Météo-France',
  );
}

/** Axe qui couvre les jours UTC de `startDate` à `endDate`, bornes comprises. */
export function createHourAxis(startDate: string, endDate: string): HourAxis {
  const startHour = hourOfDate(startDate);
  const length = hourOfDate(endDate) + HOURS_PER_DAY - startHour;
  if (length <= 0) throw new Error(`Période vide : ${startDate} → ${endDate}`);
  return { startHour, length };
}

export function emptySeries(axis: HourAxis): Float64Array {
  return new Float64Array(axis.length).fill(Number.NaN);
}

/** Jour UTC (`AAAA-MM-JJ`) de la position `index` de l'axe. */
export function dateAt(axis: HourAxis, index: number): string {
  return new Date((axis.startHour + index) * HOUR_MS).toISOString().slice(0, 10);
}

/** Heure UTC (0 à 23) de la position `index` de l'axe. */
export function utcHourAt(axis: HourAxis, index: number): number {
  return (((axis.startHour + index) % HOURS_PER_DAY) + HOURS_PER_DAY) % HOURS_PER_DAY;
}
