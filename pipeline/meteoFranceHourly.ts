// Les « Données climatologiques de base — horaires » de Météo-France (Licence Ouverte 2.0) :
// où les trouver et comment lire une mesure. Fiche du jeu de données :
// https://www.data.gouv.fr/datasets/donnees-climatologiques-de-base-horaires (lue le 17/11/2026).
// Détail des champs et des conversions : docs/features/donnees.md.

import type { ForecastVariable } from '../shared/variables.ts';

export const HOURLY_DATASET_URL =
  'https://www.data.gouv.fr/api/1/datasets/donnees-climatologiques-de-base-horaires/';
export const SEPARATOR = ';';
export const STATION_FIELD = 'NUM_POSTE';
/** Heure UTC de la mesure, au format `AAAAMMJJHH`. */
export const TIME_FIELD = 'AAAAMMJJHH';
/** Code qualité « donnée douteuse en cours de vérification » : la mesure n'est pas utilisée. */
export const DOUBTFUL_QUALITY = '2';

/** Champ du code qualité d'une mesure : `QT` pour `T`. */
export const qualityFieldOf = (field: string): string => `Q${field}`;

const identity = (raw: number): number => raw;
const metresPerSecondToKmh = (raw: number): number => raw * 3.6;
const SKY_OBSCURED_OKTAS = 9;
const oktasToPercent = (raw: number): number | null =>
  raw === SKY_OBSCURED_OKTAS ? null : raw * 12.5;

export type MeteoFranceField = {
  /** Nom de la colonne dans le fichier horaire. */
  readonly field: string;
  /** Conversion vers l'unité de Quatrauro ; `null` si la mesure est inutilisable. */
  readonly toUnit: (raw: number) => number | null;
};

export const METEO_FRANCE_FIELDS: Readonly<Record<ForecastVariable, MeteoFranceField>> = {
  temperature: { field: 'T', toUnit: identity },
  humidity: { field: 'U', toUnit: identity },
  windSpeed: { field: 'FF', toUnit: metresPerSecondToKmh },
  windGusts: { field: 'FXI', toUnit: metresPerSecondToKmh },
  windDirection: { field: 'DD', toUnit: identity },
  cloudCover: { field: 'N', toUnit: oktasToPercent },
  precipitation: { field: 'RR1', toUnit: identity },
};

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
