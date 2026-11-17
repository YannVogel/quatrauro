// Collecte des observations : les mesures horaires de la station de référence d'une ville,
// dans le format interne. Une heure sans mesure reste vide : rien n'est interpolé.

import { Readable } from 'node:stream';
import { createGunzip } from 'node:zlib';

import type { City } from '../../shared/cities.ts';
import type { Observations } from '../../shared/series.ts';
import { FORECAST_VARIABLES } from '../../shared/variables.ts';
import type { ForecastVariable } from '../../shared/variables.ts';
import { HOUR_MS, floorToHour, toInstant } from '../instant.ts';
import {
  DOUBTFUL_QUALITY,
  HOURLY_DATASET_URL,
  METEO_FRANCE_FIELDS,
  SEPARATOR,
  STATION_FIELD,
  TIME_FIELD,
  findLatestHourlyFileUrl,
  qualityFieldOf,
} from '../meteoFranceHourly.ts';
import { httpGet } from './http.ts';
import type { CollectOptions } from './options.ts';

/** Seul serveur d'où les fichiers horaires sont téléchargés (docs/features/donnees.md). */
const TRUSTED_FILE_HOSTS: readonly string[] = ['meteofrance.s3.sbg.io.cloud.ovh.net'];
const METEO_FRANCE_HOUR = /^(\d{4})(\d{2})(\d{2})(\d{2})$/;

/**
 * Bornes de vraisemblance, dans les unités de Quatrauro : au-delà, c'est une panne de capteur
 * ou une erreur de saisie, pas le temps qu'il fait à Toulon ou à Nice. La mesure est rejetée.
 */
export const PLAUSIBLE_RANGES: Readonly<
  Record<ForecastVariable, { readonly min: number; readonly max: number; readonly unit: string }>
> = {
  temperature: { min: -20, max: 50, unit: '°C' },
  humidity: { min: 0, max: 100, unit: '%' },
  windSpeed: { min: 0, max: 200, unit: 'km/h' },
  windGusts: { min: 0, max: 300, unit: 'km/h' },
  windDirection: { min: 0, max: 360, unit: '°' },
  cloudCover: { min: 0, max: 100, unit: '%' },
  precipitation: { min: 0, max: 200, unit: 'mm' },
};

/** Période demandée, bornes comprises ; chacune est ramenée à l'heure ronde. */
export type ObservationWindow = { readonly from: Date; readonly to: Date };

type Measures = Readonly<Record<ForecastVariable, number | null>>;

/** Instant d'une heure au format de Météo-France (`AAAAMMJJHH`, UTC), en millisecondes. */
function parseHour(raw: string): number {
  const match = METEO_FRANCE_HOUR.exec(raw);
  const [year, month, day, hour] = (match ?? []).slice(1).map(Number);
  const instant = Date.UTC(year ?? Number.NaN, (month ?? Number.NaN) - 1, day, hour);
  const expected = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T${raw.slice(8, 10)}:00:00Z`;
  if (match === null || Number.isNaN(instant) || toInstant(new Date(instant)) !== expected) {
    throw new Error(`Heure Météo-France invalide : « ${raw} »`);
  }
  return instant;
}

/**
 * Lit, ligne par ligne, les mesures d'une station dans un fichier horaire (la première ligne
 * est l'en-tête). `rejected` reçoit chaque mesure écartée par les bornes de vraisemblance.
 */
export function createStationReader(
  stationId: string,
  rejected: (message: string) => void,
): {
  readonly readLine: (line: string) => void;
  /** Mesures par instant (millisecondes), et nombre de lignes de la station dans le fichier. */
  readonly result: () => { readonly hours: ReadonlyMap<number, Measures>; readonly rows: number };
} {
  const hours = new Map<number, Measures>();
  let columns: Map<string, number> | undefined;
  let rows = 0;

  const column = (name: string): number => {
    const index = columns?.get(name);
    if (index === undefined) throw new Error(`Colonne « ${name} » absente du fichier horaire`);
    return index;
  };

  const measure = (fields: readonly string[], variable: ForecastVariable, time: number) => {
    const { field, toUnit } = METEO_FRANCE_FIELDS[variable];
    const raw = fields[column(field)] ?? '';
    if (raw === '' || fields[column(qualityFieldOf(field))] === DOUBTFUL_QUALITY) return null;
    const value = Number(raw);
    if (!Number.isFinite(value)) throw new Error(`Mesure illisible pour ${field} : « ${raw} »`);
    const converted = toUnit(value);
    if (converted === null) return null;
    const range = PLAUSIBLE_RANGES[variable];
    if (converted < range.min || converted > range.max) {
      rejected(
        `mesure hors bornes rejetée : ${field} = ${raw} (${converted} ${range.unit}) le ${toInstant(new Date(time))}`,
      );
      return null;
    }
    return converted;
  };

  const readLine = (line: string): void => {
    if (columns === undefined) {
      columns = new Map(line.split(SEPARATOR).map((name, index) => [name, index]));
      [STATION_FIELD, TIME_FIELD].forEach(column);
      for (const { field } of Object.values(METEO_FRANCE_FIELDS)) {
        column(field);
        column(qualityFieldOf(field));
      }
      return;
    }
    if (!line.startsWith(stationId)) return;
    const fields = line.split(SEPARATOR);
    if (fields[column(STATION_FIELD)] !== stationId) return;
    rows += 1;
    const time = parseHour(fields[column(TIME_FIELD)] ?? '');
    const values = Object.fromEntries(
      FORECAST_VARIABLES.map((variable) => [variable, measure(fields, variable, time)]),
    ) as Record<ForecastVariable, number | null>;
    // Par vent nul, le fichier donne une direction de 0 : il n'y a pas de direction (le nord s'écrit 360).
    if (values.windSpeed === 0) values.windDirection = null;
    hours.set(time, values);
  };

  return { readLine, result: () => ({ hours, rows }) };
}

/** Lignes d'un fichier compressé, sans jamais le tenir entier en mémoire une fois décompressé. */
async function* gunzipLines(compressed: ArrayBuffer): AsyncGenerator<string> {
  const gunzip = Readable.from([Buffer.from(compressed)]).pipe(createGunzip());
  const decoder = new TextDecoder();
  let rest = '';
  for await (const chunk of gunzip) {
    const lines = (rest + decoder.decode(chunk as Uint8Array, { stream: true })).split('\n');
    rest = lines.pop() ?? '';
    for (const line of lines) yield line.replace(/\r$/, '');
  }
  if (rest !== '') yield rest;
}

async function fetchDataset(options: CollectOptions): Promise<unknown> {
  const response = await httpGet(HOURLY_DATASET_URL, options.http);
  try {
    return JSON.parse(await response.text()) as unknown;
  } catch (error) {
    throw new Error("Fiche data.gouv.fr illisible : ce n'est pas du JSON", { cause: error });
  }
}

function checkFileUrl(url: string): void {
  const { protocol, host } = new URL(url);
  if (protocol !== 'https:' || !TRUSTED_FILE_HOSTS.includes(host)) {
    throw new Error(
      `Adresse inattendue pour le fichier horaire : ${url}. Vérifier la fiche du jeu de données avant de l'ajouter aux serveurs connus.`,
    );
  }
}

/**
 * Mesures horaires de la station de référence d'une ville sur la période demandée : une
 * valeur par heure, `null` quand la station n'a rien publié (ou pas encore) pour cette heure.
 */
export async function collectObservations(
  city: City,
  window: ObservationWindow,
  options: CollectOptions,
): Promise<Observations> {
  const { station } = city;
  const url = findLatestHourlyFileUrl(await fetchDataset(options), station.department);
  checkFileUrl(url);
  const file = await httpGet(url, options.http);

  const reader = createStationReader(station.id, (message) =>
    options.log(`${city.name} : ${message}`),
  );
  try {
    for await (const line of gunzipLines(await file.arrayBuffer())) reader.readLine(line);
  } catch (error) {
    throw new Error(`Fichier horaire de ${station.name} illisible : ${String(error)}`, {
      cause: error,
    });
  }
  const { hours, rows } = reader.result();
  if (rows === 0) {
    throw new Error(`Station ${station.id} (${station.name}) absente du fichier horaire`);
  }

  const times: number[] = [];
  const last = floorToHour(window.to.getTime());
  for (let time = floorToHour(window.from.getTime()); time <= last; time += HOUR_MS) {
    times.push(time);
  }
  return {
    stationId: station.id,
    times: times.map((time) => toInstant(new Date(time))),
    values: Object.fromEntries(
      FORECAST_VARIABLES.map((variable) => [
        variable,
        times.map((time) => hours.get(time)?.[variable] ?? null),
      ]),
    ) as Record<ForecastVariable, (number | null)[]>,
  };
}
