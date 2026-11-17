import { PERIOD } from '../config.ts';
import type { CityData } from '../data/dataset.ts';
import { dateAt, hourOfDate } from '../data/hours.ts';
import type { DateRange } from '../evaluate.ts';

const dayBefore = (date: string): string => dateAt({ startHour: hourOfDate(date) - 24, length: 1 }, 0);

/** Les paramètres sont choisis sur `selection`, puis jugés sur `validation` ; `year` réunit les deux. */
export const RANGES: Readonly<Record<'selection' | 'validation' | 'year', DateRange>> = {
  selection: { from: PERIOD.scoringStart, to: dayBefore(PERIOD.validationStart) },
  validation: { from: PERIOD.validationStart, to: PERIOD.end },
  year: { from: PERIOD.scoringStart, to: PERIOD.end },
};

export const formatDate = (date: string): string => `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`;
export const formatRange = (range: DateRange): string => `du ${formatDate(range.from)} au ${formatDate(range.to)}`;

export type Cities = readonly CityData[];
