// Registre des jours jugés : pour chaque jour civil de Paris et chaque échéance, ce qui avait
// été prévu, ce qui a été mesuré, et si la prévision a été tenue. Un fichier par ville et par
// mois. C'est de lui que viennent le « prévu contre observé » et le taux de réussite de la pluie.

import { z } from 'zod';

import { MAX_LEAD_DAYS } from '../../shared/blendConfig.ts';
import { CITY_IDS } from '../../shared/cities.ts';
import type { CityId } from '../../shared/cities.ts';
import { readJson, writeJson } from '../storage.ts';
import type { Storage } from '../storage.ts';
import type { DayRecord } from '../verify/learn.ts';

export const DAYS_SCHEMA_VERSION = 1;

const value = z.number().nullable();
const recordSchema = z.object({
  date: z.iso.date(),
  lead: z.number().int().min(1).max(MAX_LEAD_DAYS),
  forecastMin: value,
  forecastMax: value,
  spread: value,
  rainProbability: value,
  observedMin: value,
  observedMax: value,
  observedRain: value,
  rainHeld: z.boolean().nullable(),
  held: z.boolean().nullable(),
});
const fileSchema = z.object({
  schemaVersion: z.literal(DAYS_SCHEMA_VERSION),
  city: z.enum(CITY_IDS),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  days: z.array(recordSchema),
});

const monthOf = (date: string): string => date.slice(0, 7);
const fileOf = (cityId: CityId, month: string): string => `archive/days/${cityId}/${month}.json`;
const keyOf = (record: DayRecord): string => `${record.date}:${record.lead}`;

/** Ajoute des jours jugés au registre. Un jour déjà inscrit à la même échéance est remplacé par lui-même. */
export async function archiveDays(
  storage: Storage,
  cityId: CityId,
  records: readonly DayRecord[],
): Promise<void> {
  const months = new Set(records.map((record) => monthOf(record.date)));
  for (const month of months) {
    const existing = await readJson(storage, fileOf(cityId, month), fileSchema);
    const byKey = new Map((existing?.days ?? []).map((record) => [keyOf(record), record]));
    for (const record of records) {
      if (monthOf(record.date) === month) byKey.set(keyOf(record), record);
    }
    const days = [...byKey.values()].sort(
      (a, b) => a.date.localeCompare(b.date) || a.lead - b.lead,
    );
    await writeJson(storage, fileOf(cityId, month), {
      schemaVersion: DAYS_SCHEMA_VERSION,
      city: cityId,
      month,
      days,
    });
  }
}

/** Jours jugés entre deux jours civils de Paris (bornes comprises), dans l'ordre. */
export async function readDays(
  storage: Storage,
  cityId: CityId,
  from: string,
  to: string,
): Promise<DayRecord[]> {
  const records: DayRecord[] = [];
  const cursor = new Date(`${monthOf(from)}-01T00:00:00Z`);
  const last = new Date(`${monthOf(to)}-01T00:00:00Z`);
  while (cursor.getTime() <= last.getTime()) {
    const month = cursor.toISOString().slice(0, 7);
    const file = await readJson(storage, fileOf(cityId, month), fileSchema);
    records.push(
      ...(file?.days ?? []).filter((record) => record.date >= from && record.date <= to),
    );
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return records;
}
