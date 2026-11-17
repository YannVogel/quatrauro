// Configuration propre au backtest. Les villes, les modèles et les paramètres en vigueur
// viennent de `shared/` ; ne restent ici que le modèle candidat, la correspondance des
// variables avec les deux sources et la période rejouée.

import type { Model } from '../../shared/models.ts';
import { METEO_FRANCE_FIELDS } from '../meteoFranceHourly.ts';
import { OPEN_METEO_NAMES } from '../openMeteoNames.ts';

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

export const VARIABLES: readonly Variable[] = [
  {
    id: 'temperature',
    label: 'Température',
    unit: '°C',
    openMeteoName: OPEN_METEO_NAMES.temperature,
    observationField: METEO_FRANCE_FIELDS.temperature.field,
    toUnit: METEO_FRANCE_FIELDS.temperature.toUnit,
  },
  {
    id: 'humidity',
    label: 'Humidité',
    unit: '%',
    openMeteoName: OPEN_METEO_NAMES.humidity,
    observationField: METEO_FRANCE_FIELDS.humidity.field,
    toUnit: METEO_FRANCE_FIELDS.humidity.toUnit,
  },
  {
    id: 'windSpeed',
    label: 'Vent moyen',
    unit: 'km/h',
    openMeteoName: OPEN_METEO_NAMES.windSpeed,
    observationField: METEO_FRANCE_FIELDS.windSpeed.field,
    toUnit: METEO_FRANCE_FIELDS.windSpeed.toUnit,
  },
  {
    id: 'windGusts',
    label: 'Rafales',
    unit: 'km/h',
    openMeteoName: OPEN_METEO_NAMES.windGusts,
    observationField: METEO_FRANCE_FIELDS.windGusts.field,
    toUnit: METEO_FRANCE_FIELDS.windGusts.toUnit,
  },
  {
    id: 'cloudCover',
    label: 'Nébulosité',
    unit: '%',
    openMeteoName: OPEN_METEO_NAMES.cloudCover,
    observationField: METEO_FRANCE_FIELDS.cloudCover.field,
    toUnit: METEO_FRANCE_FIELDS.cloudCover.toUnit,
  },
  {
    id: 'precipitation',
    label: 'Précipitations',
    unit: 'mm',
    openMeteoName: OPEN_METEO_NAMES.precipitation,
    observationField: METEO_FRANCE_FIELDS.precipitation.field,
    toUnit: METEO_FRANCE_FIELDS.precipitation.toUnit,
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
