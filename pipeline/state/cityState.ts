// État d'une ville : ce que le pipeline a appris de chaque modèle (biais, erreur), de la pluie
// et de la tenue de ses prévisions. Il est lu au début d'un passage et réécrit à la fin.

import { z } from 'zod';

import { EMPTY_DECAYED_MEAN } from '../../shared/blend/decayedMean.ts';
import type { DecayedMean } from '../../shared/blend/decayedMean.ts';
import { hourBlockOf, leadBucketOf } from '../../shared/blend/grouping.ts';
import { EMPTY_RAIN_CALIBRATION } from '../../shared/blend/rain.ts';
import type { RainCalibration } from '../../shared/blend/rain.ts';
import { emptyReliabilityTable } from '../../shared/blend/reliability.ts';
import type { ReliabilityTable } from '../../shared/blend/reliability.ts';
import { BLEND_CONFIG } from '../../shared/blendConfig.ts';
import { CITY_IDS } from '../../shared/cities.ts';
import type { CityId } from '../../shared/cities.ts';
import { MODEL_IDS } from '../../shared/models.ts';
import type { ModelId } from '../../shared/models.ts';
import type { ModelState } from '../../shared/series.ts';
import { CORRECTED_VARIABLES } from '../../shared/variables.ts';
import type { CorrectedVariable } from '../../shared/variables.ts';
import { STATE_DECIMALS, roundTo } from '../config.ts';
import { readJson, writeJson } from '../storage.ts';
import type { Storage } from '../storage.ts';

export const STATE_SCHEMA_VERSION = 1;

const BUCKET_COUNT = BLEND_CONFIG.leadGrouping.length;
const EMPTY_MODEL_STATE: ModelState = { bias: EMPTY_DECAYED_MEAN, error: EMPTY_DECAYED_MEAN };

export type CityState = {
  cityId: CityId;
  /** Instant du dernier passage dont les prévisions sont archivées. */
  lastCollectedAt: string | null;
  /** Dernière heure dont l'observation a été apprise. */
  learnedThrough: string | null;
  /** Dernier jour civil de Paris appris. */
  learnedDayThrough: string | null;
  /** `models[variable][modèle][tranche d'échéance][heure UTC]`. */
  models: Record<CorrectedVariable, Partial<Record<ModelId, ModelState[][]>>>;
  /** Calibration de la pluie dans l'heure et dans la journée, par tranche d'échéance. */
  hourlyRain: RainCalibration[];
  dailyRain: RainCalibration[];
  /** Table de l'indice de fiabilité, par tranche d'échéance. */
  reliability: ReliabilityTable[];
};

export function emptyCityState(cityId: CityId): CityState {
  return {
    cityId,
    lastCollectedAt: null,
    learnedThrough: null,
    learnedDayThrough: null,
    models: Object.fromEntries(CORRECTED_VARIABLES.map((variable) => [variable, {}])) as Record<
      CorrectedVariable,
      Partial<Record<ModelId, ModelState[][]>>
    >,
    hourlyRain: Array.from({ length: BUCKET_COUNT }, () => EMPTY_RAIN_CALIBRATION),
    dailyRain: Array.from({ length: BUCKET_COUNT }, () => EMPTY_RAIN_CALIBRATION),
    reliability: Array.from({ length: BUCKET_COUNT }, () =>
      emptyReliabilityTable(BLEND_CONFIG.reliability),
    ),
  };
}

/** Rang de la tranche d'une échéance ; `null` au-delà de la dernière tranche. */
export const bucketOf = (leadDays: number): number | null =>
  leadBucketOf(leadDays, BLEND_CONFIG.leadGrouping);

type Slot = {
  readonly variable: CorrectedVariable;
  readonly modelId: ModelId;
  readonly bucket: number;
  /** Heure UTC de la journée, de 0 à 23. */
  readonly utcHour: number;
};

const blockOf = (utcHour: number): number => hourBlockOf(utcHour, BLEND_CONFIG.hourBlocksPerDay);

export function modelStateOf(state: CityState, slot: Slot): ModelState {
  return (
    state.models[slot.variable][slot.modelId]?.[slot.bucket]?.[blockOf(slot.utcHour)] ??
    EMPTY_MODEL_STATE
  );
}

export function setModelState(state: CityState, slot: Slot, value: ModelState): void {
  const byModel = state.models[slot.variable];
  byModel[slot.modelId] ??= Array.from({ length: BUCKET_COUNT }, () =>
    Array.from({ length: BLEND_CONFIG.hourBlocksPerDay }, () => EMPTY_MODEL_STATE),
  );
  const blocks = byModel[slot.modelId]?.[slot.bucket];
  if (blocks === undefined) throw new Error(`Tranche d'échéance inconnue : ${slot.bucket}`);
  blocks[blockOf(slot.utcHour)] = value;
}

// --- Fichier -------------------------------------------------------------------------------
// Une moyenne qui oublie s'écrit [somme pondérée, poids, nombre, dernière heure] ; un état de
// modèle, ses deux moyennes à la suite ; une fréquence, [réussites, total].

const frequency = z.tuple([z.number().int().min(0), z.number().int().min(0)]);
const instant = z.iso.datetime().nullable();
const calibration = z.object({ overall: frequency, byClass: z.array(frequency) });

const stateFileSchema = z.object({
  schemaVersion: z.literal(STATE_SCHEMA_VERSION),
  city: z.enum(CITY_IDS),
  lastCollectedAt: instant,
  learnedThrough: instant,
  learnedDayThrough: z.iso.date().nullable(),
  models: z.record(
    z.enum(CORRECTED_VARIABLES),
    z.partialRecord(z.enum(MODEL_IDS), z.array(z.array(z.array(z.number()).length(8)))),
  ),
  hourlyRain: z.array(calibration).length(BUCKET_COUNT),
  dailyRain: z.array(calibration).length(BUCKET_COUNT),
  reliability: z
    .array(z.object({ overall: frequency, cells: z.array(z.array(frequency)) }))
    .length(BUCKET_COUNT),
});

type StateFile = z.infer<typeof stateFileSchema>;
type FrequencyTuple = z.infer<typeof frequency>;

const round = (value: number): number => roundTo(value, STATE_DECIMALS);
const encodeMean = (mean: DecayedMean): number[] => [
  round(mean.weightedSum),
  round(mean.weight),
  mean.count,
  mean.lastHour,
];
const decodeMean = (values: readonly number[], offset: number): DecayedMean => ({
  weightedSum: values[offset] ?? 0,
  weight: values[offset + 1] ?? 0,
  count: values[offset + 2] ?? 0,
  lastHour: values[offset + 3] ?? 0,
});
const encodeFrequency = (value: { hits: number; total: number }): FrequencyTuple => [
  value.hits,
  value.total,
];
const decodeFrequency = ([hits, total]: FrequencyTuple) => ({ hits, total });

function encode(state: CityState): StateFile {
  return {
    schemaVersion: STATE_SCHEMA_VERSION,
    city: state.cityId,
    lastCollectedAt: state.lastCollectedAt,
    learnedThrough: state.learnedThrough,
    learnedDayThrough: state.learnedDayThrough,
    models: Object.fromEntries(
      CORRECTED_VARIABLES.map((variable) => [
        variable,
        Object.fromEntries(
          Object.entries(state.models[variable]).map(([modelId, buckets]) => [
            modelId,
            buckets.map((blocks) =>
              blocks.map((slot) => [...encodeMean(slot.bias), ...encodeMean(slot.error)]),
            ),
          ]),
        ),
      ]),
    ) as StateFile['models'],
    hourlyRain: state.hourlyRain.map(encodeCalibration),
    dailyRain: state.dailyRain.map(encodeCalibration),
    reliability: state.reliability.map((table) => ({
      overall: encodeFrequency(table.overall),
      cells: table.cells.map((row) => row.map(encodeFrequency)),
    })),
  };
}

function encodeCalibration(value: RainCalibration): z.infer<typeof calibration> {
  return { overall: encodeFrequency(value.overall), byClass: value.byClass.map(encodeFrequency) };
}

function decode(file: StateFile): CityState {
  return {
    cityId: file.city,
    lastCollectedAt: file.lastCollectedAt,
    learnedThrough: file.learnedThrough,
    learnedDayThrough: file.learnedDayThrough,
    models: Object.fromEntries(
      CORRECTED_VARIABLES.map((variable) => [
        variable,
        Object.fromEntries(
          Object.entries(file.models[variable]).map(([modelId, buckets]) => [
            modelId,
            buckets.map((blocks) =>
              blocks.map((values) => ({
                bias: decodeMean(values, 0),
                error: decodeMean(values, 4),
              })),
            ),
          ]),
        ),
      ]),
    ) as CityState['models'],
    hourlyRain: file.hourlyRain.map(decodeCalibration),
    dailyRain: file.dailyRain.map(decodeCalibration),
    reliability: file.reliability.map((table) => ({
      overall: decodeFrequency(table.overall),
      cells: table.cells.map((row) => row.map(decodeFrequency)),
    })),
  };
}

function decodeCalibration(value: z.infer<typeof calibration>): RainCalibration {
  return { overall: decodeFrequency(value.overall), byClass: value.byClass.map(decodeFrequency) };
}

export const stateFileOf = (cityId: CityId): string => `state/${cityId}.json`;

/** État enregistré d'une ville, ou `null` si elle n'en a pas encore. */
export async function loadCityState(storage: Storage, cityId: CityId): Promise<CityState | null> {
  const file = await readJson(storage, stateFileOf(cityId), stateFileSchema);
  return file === null ? null : decode(file);
}

export async function saveCityState(storage: Storage, state: CityState): Promise<void> {
  await writeJson(storage, stateFileOf(state.cityId), encode(state));
}

/** L'état tel qu'il sera relu : arrondi comme dans le fichier. */
export const normalizeCityState = (state: CityState): CityState => decode(encode(state));
