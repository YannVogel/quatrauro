// Configuration du backtest (spike M0-03).
// Villes, modèles et variables viennent de l'ADR 0002 ; ils rejoindront `shared/` en M1-01.

export type City = {
  readonly id: string;
  readonly name: string;
  readonly latitude: number;
  readonly longitude: number;
  /** Département du fichier horaire de Météo-France. */
  readonly department: string;
  /** Numéro Météo-France de la station de référence. */
  readonly station: string;
};

export const CITIES: readonly City[] = [
  {
    id: 'toulon',
    name: 'Toulon',
    latitude: 43.1257,
    longitude: 5.9304,
    department: '83',
    station: '83137001',
  },
  {
    id: 'nice',
    name: 'Nice',
    latitude: 43.6973,
    longitude: 7.2702,
    department: '06',
    station: '06088001',
  },
];

export type Model = {
  readonly id: string;
  readonly name: string;
  readonly openMeteoId: string;
  /** Plus grand décalage `_previous_dayN` rempli dans l'API Previous Runs (mesuré en M0-02). */
  readonly historyLeadDays: number;
};

export const MODELS: readonly Model[] = [
  { id: 'arome', name: 'AROME', openMeteoId: 'meteofrance_arome_france', historyLeadDays: 1 },
  { id: 'arpege', name: 'ARPEGE', openMeteoId: 'meteofrance_arpege_europe', historyLeadDays: 3 },
  { id: 'ifs', name: 'IFS', openMeteoId: 'ecmwf_ifs', historyLeadDays: 7 },
  { id: 'icon', name: 'ICON', openMeteoId: 'dwd_icon_seamless', historyLeadDays: 6 },
  { id: 'gfs', name: 'GFS', openMeteoId: 'ncep_gfs_global', historyLeadDays: 7 },
];

/** Candidat écarté par l'ADR 0002 faute d'historique complet ; évalué à part par le backtest. */
export const CANDIDATE_MODEL: Model = {
  id: 'ukmo',
  name: 'UKMO',
  openMeteoId: 'ukmo_global_deterministic_10km',
  historyLeadDays: 6,
};

export type VariableId =
  'temperature' | 'humidity' | 'windSpeed' | 'windGusts' | 'cloudCover' | 'precipitation';

export type Variable = {
  readonly id: VariableId;
  readonly label: string;
  readonly unit: string;
  readonly openMeteoName: string;
  /** Champ du fichier horaire de Météo-France. */
  readonly observationField: string;
  /** Conversion de l'unité du fichier vers celle de Quatrauro ; `null` si la mesure est inutilisable. */
  readonly toUnit: (raw: number) => number | null;
};

const identity = (raw: number): number => raw;
const metresPerSecondToKmh = (raw: number): number => raw * 3.6;
const SKY_OBSCURED_OKTAS = 9;
const oktasToPercent = (raw: number): number | null =>
  raw === SKY_OBSCURED_OKTAS ? null : raw * 12.5;

export const VARIABLES: readonly Variable[] = [
  {
    id: 'temperature',
    label: 'Température',
    unit: '°C',
    openMeteoName: 'temperature_2m',
    observationField: 'T',
    toUnit: identity,
  },
  {
    id: 'humidity',
    label: 'Humidité',
    unit: '%',
    openMeteoName: 'relative_humidity_2m',
    observationField: 'U',
    toUnit: identity,
  },
  {
    id: 'windSpeed',
    label: 'Vent moyen',
    unit: 'km/h',
    openMeteoName: 'wind_speed_10m',
    observationField: 'FF',
    toUnit: metresPerSecondToKmh,
  },
  {
    id: 'windGusts',
    label: 'Rafales',
    unit: 'km/h',
    openMeteoName: 'wind_gusts_10m',
    observationField: 'FXI',
    toUnit: metresPerSecondToKmh,
  },
  {
    id: 'cloudCover',
    label: 'Nébulosité',
    unit: '%',
    openMeteoName: 'cloud_cover',
    observationField: 'N',
    toUnit: oktasToPercent,
  },
  {
    id: 'precipitation',
    label: 'Précipitations',
    unit: 'mm',
    openMeteoName: 'precipitation',
    observationField: 'RR1',
    toUnit: identity,
  },
];

export const MAX_LEAD_DAYS = 7;

/**
 * Période téléchargée. IFS HRES n'est dans l'historique que depuis octobre 2025 (ADR 0002).
 * Les 46 premiers jours servent d'apprentissage et ne sont pas notés.
 */
export const PERIOD = {
  start: '2025-10-01',
  end: '2026-11-15',
  scoringStart: '2025-11-16',
  /** Les paramètres sont choisis avant cette date, puis jugés après. */
  validationStart: '2026-05-16',
} as const;

/**
 * Délai entre une mesure et sa disponibilité dans les fichiers de Météo-France.
 * Mesuré à 27 h au plus en M0-02 ; arrondi au-dessus par prudence.
 */
export const OBSERVATION_DELAY_HOURS = 30;
