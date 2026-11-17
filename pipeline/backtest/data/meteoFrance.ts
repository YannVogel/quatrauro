// Lecture des « Données climatologiques de base — horaires » de Météo-France (Licence Ouverte 2.0).
// Fiche du jeu de données : https://www.data.gouv.fr/datasets/donnees-climatologiques-de-base-horaires

import { createReadStream } from 'node:fs';
import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { createGunzip } from 'node:zlib';

import type { City } from '../../../shared/cities.ts';
import type { Variable, VariableId } from '../config.ts';
import {
  DOUBTFUL_QUALITY,
  HOURLY_DATASET_URL,
  SEPARATOR,
  STATION_FIELD,
  TIME_FIELD,
  findLatestHourlyFileUrl,
  qualityFieldOf,
} from '../../meteoFranceHourly.ts';
import { emptySeries, hourOfMeteoFranceTime } from './hours.ts';
import type { HourAxis } from './hours.ts';

export type Observations = Record<VariableId, Float64Array>;

/** Lit les lignes d'une station dans un fichier horaire (texte CSV, première ligne = en-tête). */
export function createHourlyParser(
  station: string,
  variables: readonly Variable[],
  axis: HourAxis,
): { readonly readLine: (line: string) => void; readonly result: () => Observations } {
  const series = Object.fromEntries(
    variables.map((variable) => [variable.id, emptySeries(axis)]),
  ) as Observations;
  let columns: Map<string, number> | undefined;

  const column = (name: string): number => {
    const index = columns?.get(name);
    if (index === undefined) throw new Error(`Colonne « ${name} » absente du fichier horaire`);
    return index;
  };

  const readLine = (line: string): void => {
    if (columns === undefined) {
      columns = new Map(line.split(SEPARATOR).map((name, index) => [name, index]));
      [STATION_FIELD, TIME_FIELD].forEach(column);
      variables.forEach((variable) => {
        column(variable.observationField);
        column(qualityFieldOf(variable.observationField));
      });
      return;
    }
    if (!line.startsWith(station)) return;
    const fields = line.split(SEPARATOR);
    if (fields[column(STATION_FIELD)] !== station) return;
    const position = hourOfMeteoFranceTime(fields[column(TIME_FIELD)] ?? '') - axis.startHour;
    if (position < 0 || position >= axis.length) return;
    for (const variable of variables) {
      const raw = fields[column(variable.observationField)] ?? '';
      if (
        raw === '' ||
        fields[column(qualityFieldOf(variable.observationField))] === DOUBTFUL_QUALITY
      )
        continue;
      const value = Number(raw);
      if (!Number.isFinite(value))
        throw new Error(`Mesure inattendue pour ${variable.observationField} : « ${raw} »`);
      const converted = variable.toUnit(value);
      if (converted !== null) series[variable.id][position] = converted;
    }
  };

  return { readLine, result: () => series };
}

async function exists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function download(url: string, file: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Téléchargement impossible (${response.status}) : ${url}`);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, Buffer.from(await response.arrayBuffer()));
}

/** Observations horaires de la station de référence d'une ville, alignées sur l'axe. */
export async function loadObservations(
  cacheDir: string,
  city: City,
  variables: readonly Variable[],
  axis: HourAxis,
): Promise<Observations> {
  const file = path.join(cacheDir, 'meteo-france', `H_${city.station.department}_latest.csv.gz`);
  if (!(await exists(file))) {
    const dataset = await fetch(HOURLY_DATASET_URL);
    if (!dataset.ok) throw new Error(`Fiche data.gouv.fr inaccessible (${dataset.status})`);
    await download(findLatestHourlyFileUrl(await dataset.json(), city.station.department), file);
  }
  const parser = createHourlyParser(city.station.id, variables, axis);
  const lines = createInterface({
    input: createReadStream(file).pipe(createGunzip()),
    crlfDelay: Infinity,
  });
  for await (const line of lines) parser.readLine(line);
  return parser.result();
}
