// Archive des prévisions : pour chaque heure à venir et chaque échéance, ce que chaque modèle
// prévoyait (valeur brute et valeur corrigée de son biais du moment) et ce que donnait le
// mélange. Un fichier par ville et par jour de collecte (UTC), en ajout seul : chaque passage
// y ajoute ses heures, et un fichier ne change plus une fois son jour passé.
//
// Une « case » est une heure de validité vue à une échéance donnée : la prévision émise
// N jours avant cette heure, à l'intervalle entre deux passages près.

import { z } from 'zod';

import { MAX_LEAD_DAYS } from '../../shared/blendConfig.ts';
import { CITY_IDS } from '../../shared/cities.ts';
import type { CityId } from '../../shared/cities.ts';
import { MODEL_IDS } from '../../shared/models.ts';
import type { ModelId } from '../../shared/models.ts';
import { CORRECTED_VARIABLES, FORECAST_VARIABLES } from '../../shared/variables.ts';
import type { CorrectedVariable, ForecastVariable } from '../../shared/variables.ts';
import { DAY_MS, HOUR_MS, toInstant, utcDateOf } from '../instant.ts';
import { readJson, writeJson } from '../storage.ts';
import type { Storage } from '../storage.ts';

export const FORECASTS_SCHEMA_VERSION = 1;

export type ModelCell = {
  readonly raw: Readonly<Record<ForecastVariable, number | null>>;
  /** Valeur corrigée du biais connu au moment de la collecte. */
  readonly corrected: Readonly<Record<CorrectedVariable, number | null>>;
};

export type Cell = {
  /** Heure de validité, en millisecondes. */
  readonly time: number;
  /** Échéance, en jours. */
  readonly lead: number;
  readonly models: Readonly<Partial<Record<ModelId, ModelCell>>>;
  readonly blend: {
    readonly temperature: number | null;
    readonly temperatureSpread: number | null;
  };
};

/** Les cases d'un passage. */
export type Pass = { readonly collectedAt: string; readonly cells: readonly Cell[] };

export type CellIndex = {
  readonly at: (time: number, lead: number) => Cell | undefined;
  /** Heure de validité la plus ancienne de l'archive lue, ou `null` si elle est vide. */
  readonly earliest: number | null;
};

const series = z.array(z.number().nullable());
const blockSchema = z.object({
  lead: z.number().int().min(1).max(MAX_LEAD_DAYS),
  /** Première heure de validité du bloc ; les suivantes se suivent d'heure en heure. */
  from: z.iso.datetime(),
  hours: z.number().int().min(1),
  models: z.partialRecord(
    z.enum(MODEL_IDS),
    z.object({
      raw: z.record(z.enum(FORECAST_VARIABLES), series),
      corrected: z.record(z.enum(CORRECTED_VARIABLES), series),
    }),
  ),
  blend: z.object({ temperature: series, temperatureSpread: series }),
});
const fileSchema = z.object({
  schemaVersion: z.literal(FORECASTS_SCHEMA_VERSION),
  city: z.enum(CITY_IDS),
  /** Jour UTC des collectes du fichier. */
  date: z.iso.date(),
  passes: z.array(z.object({ collectedAt: z.iso.datetime(), blocks: z.array(blockSchema) })),
});

type ForecastFile = z.infer<typeof fileSchema>;
type Block = z.infer<typeof blockSchema>;

const directoryOf = (cityId: CityId): string => `archive/forecasts/${cityId}`;
const fileOf = (cityId: CityId, date: string): string => `${directoryOf(cityId)}/${date}.json`;

/** Regroupe les cases d'un passage en blocs d'heures consécutives, un par échéance. */
function toBlocks(cells: readonly Cell[]): Block[] {
  const blocks: Block[] = [];
  const sorted = [...cells].sort((a, b) => a.lead - b.lead || a.time - b.time);
  let run: Cell[] = [];
  const flush = (): void => {
    const [first] = run;
    if (first === undefined) return;
    const modelIds = MODEL_IDS.filter((modelId) => run.some((cell) => cell.models[modelId]));
    blocks.push({
      lead: first.lead,
      from: toInstant(first.time),
      hours: run.length,
      models: Object.fromEntries(
        modelIds.map((modelId) => [
          modelId,
          {
            raw: Object.fromEntries(
              FORECAST_VARIABLES.map((variable) => [
                variable,
                run.map((cell) => cell.models[modelId]?.raw[variable] ?? null),
              ]),
            ),
            corrected: Object.fromEntries(
              CORRECTED_VARIABLES.map((variable) => [
                variable,
                run.map((cell) => cell.models[modelId]?.corrected[variable] ?? null),
              ]),
            ),
          },
        ]),
      ) as Block['models'],
      blend: {
        temperature: run.map((cell) => cell.blend.temperature),
        temperatureSpread: run.map((cell) => cell.blend.temperatureSpread),
      },
    });
    run = [];
  };
  for (const cell of sorted) {
    const previous = run.at(-1);
    if (
      previous !== undefined &&
      (previous.lead !== cell.lead || cell.time - previous.time !== HOUR_MS)
    ) {
      flush();
    }
    run.push(cell);
  }
  flush();
  return blocks;
}

function* cellsOf(block: Block): Generator<Cell> {
  const from = Date.parse(block.from);
  for (let index = 0; index < block.hours; index += 1) {
    yield {
      time: from + index * HOUR_MS,
      lead: block.lead,
      models: Object.fromEntries(
        Object.entries(block.models).map(([modelId, values]) => [
          modelId,
          {
            raw: Object.fromEntries(
              FORECAST_VARIABLES.map((variable) => [variable, values.raw[variable][index] ?? null]),
            ),
            corrected: Object.fromEntries(
              CORRECTED_VARIABLES.map((variable) => [
                variable,
                values.corrected[variable][index] ?? null,
              ]),
            ),
          },
        ]),
      ) as Cell['models'],
      blend: {
        temperature: block.blend.temperature[index] ?? null,
        temperatureSpread: block.blend.temperatureSpread[index] ?? null,
      },
    };
  }
}

/**
 * Ajoute les cases d'un passage à l'archive. Un passage déjà archivé (même instant de
 * collecte) est remplacé par lui-même : relancer ne duplique rien.
 */
export async function archivePass(storage: Storage, cityId: CityId, pass: Pass): Promise<void> {
  if (pass.cells.length === 0) return;
  const date = utcDateOf(Date.parse(pass.collectedAt));
  const existing = await readJson(storage, fileOf(cityId, date), fileSchema);
  const passes = (existing?.passes ?? []).filter((entry) => entry.collectedAt !== pass.collectedAt);
  passes.push({ collectedAt: pass.collectedAt, blocks: toBlocks(pass.cells) });
  passes.sort((a, b) => a.collectedAt.localeCompare(b.collectedAt));
  const file: ForecastFile = {
    schemaVersion: FORECASTS_SCHEMA_VERSION,
    city: cityId,
    date,
    passes,
  };
  await writeJson(storage, fileOf(cityId, date), file);
}

const keyOf = (time: number, lead: number): string => `${time}:${lead}`;

/** Index en mémoire de cases : la première reçue pour une heure et une échéance fait foi. */
export function indexCells(cells: Iterable<Cell>): CellIndex {
  const index = new Map<string, Cell>();
  let earliest: number | null = null;
  for (const cell of cells) {
    const key = keyOf(cell.time, cell.lead);
    if (index.has(key)) continue;
    index.set(key, cell);
    earliest = earliest === null ? cell.time : Math.min(earliest, cell.time);
  }
  return { at: (time, lead) => index.get(keyOf(time, lead)), earliest };
}

/**
 * Cases archivées dont l'heure de validité tombe entre deux instants (bornes comprises). Une
 * case d'échéance N a été collectée jusqu'à N jours plus tôt : on lit les fichiers en conséquence.
 */
export async function readCells(
  storage: Storage,
  cityId: CityId,
  from: number,
  to: number,
): Promise<CellIndex> {
  const firstDate = utcDateOf(from - (MAX_LEAD_DAYS + 1) * DAY_MS);
  const lastDate = utcDateOf(to);
  const names = (await storage.list(directoryOf(cityId))).filter((name) => {
    const date = name.replace(/\.json$/, '');
    return date >= firstDate && date <= lastDate;
  });
  const cells: Cell[] = [];
  for (const name of names) {
    const file = await readJson(storage, `${directoryOf(cityId)}/${name}`, fileSchema);
    for (const pass of file?.passes ?? []) {
      for (const block of pass.blocks) {
        for (const cell of cellsOf(block)) {
          if (cell.time >= from && cell.time <= to) cells.push(cell);
        }
      }
    }
  }
  return indexCells(cells);
}
