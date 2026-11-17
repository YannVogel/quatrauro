// Configuration propre au backtest. Les villes, les modèles et les paramètres en vigueur
// viennent de `shared/` ; ne restent ici que le modèle candidat, la correspondance des
// variables avec les deux sources et la période rejouée.

import type { Model } from '../../shared/models.ts';

/** Candidat écarté par l'ADR 0002 faute d'historique complet ; évalué à part par le backtest. */
export const CANDIDATE_MODEL: Model = {
  id: 'ukmo',
  name: 'UKMO',
  provider: 'UK Met Office',
  openMeteoId: 'ukmo_global_deterministic_10km',
  horizonHours: 168,
  updateEveryHours: 6,
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
