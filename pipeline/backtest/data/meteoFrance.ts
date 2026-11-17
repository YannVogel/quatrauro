// Lecture des « Données climatologiques de base — horaires » de Météo-France (Licence Ouverte 2.0).
// Fiche du jeu de données : https://www.data.gouv.fr/datasets/donnees-climatologiques-de-base-horaires

import { createReadStream } from 'node:fs';
import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { createGunzip } from 'node:zlib';

import type { City, Variable, VariableId } from '../config.ts';
import { emptySeries, hourOfMeteoFranceTime } from './hours.ts';
import type { HourAxis } from './hours.ts';

const DATASET_URL =
  'https://www.data.gouv.fr/api/1/datasets/donnees-climatologiques-de-base-horaires/';
const SEPARATOR = ';';
const STATION_FIELD = 'NUM_POSTE';
const TIME_FIELD = 'AAAAMMJJHH';
/** Code qualité « donnée douteuse en cours de vérification » : la mesure n'est pas utilisée. */
const DOUBTFUL_QUALITY = '2';

export type Observations = Record<VariableId, Float64Array>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Adresse du fichier « deux dernières années » d'un département. Son nom porte ses années
 * (`H_83_latest-2025-2026.csv.gz`) : on la lit dans la fiche du jeu de données.
 */
export function findLatestHourlyFileUrl(dataset: unknown, department: string): string {
  if (!isRecord(dataset) || !Array.isArray(dataset.resources)) {
    throw new Error('Fiche data.gouv.fr sans liste de ressources');
  }
  const pattern = new RegExp(`/H_${department}_latest-\\d{4}-\\d{4}\\.csv\\.gz$`);
  const urls = dataset.resources
    .map((resource) => (isRecord(resource) ? resource.url : undefined))
    .filter((url): url is string => typeof url === 'string' && pattern.test(url));
  const [url] = urls;
  if (url === undefined || urls.length > 1) {
    throw new Error(
      `Fichier horaire récent introuvable ou ambigu pour le département ${department}`,
    );
  }
  return url;
}

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
        column(`Q${variable.observationField}`);
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
      if (raw === '' || fields[column(`Q${variable.observationField}`)] === DOUBTFUL_QUALITY)
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
  const file = path.join(cacheDir, 'meteo-france', `H_${city.department}_latest.csv.gz`);
  if (!(await exists(file))) {
    const dataset = await fetch(DATASET_URL);
    if (!dataset.ok) throw new Error(`Fiche data.gouv.fr inaccessible (${dataset.status})`);
    await download(findLatestHourlyFileUrl(await dataset.json(), city.department), file);
  }
  const parser = createHourlyParser(city.station, variables, axis);
  const lines = createInterface({
    input: createReadStream(file).pipe(createGunzip()),
    crlfDelay: Infinity,
  });
  for await (const line of lines) parser.readLine(line);
  return parser.result();
}
