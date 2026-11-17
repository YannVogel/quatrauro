// Contrat des fichiers que le pipeline publie et que l'app lit. Le même schéma sert des deux
// côtés : le pipeline valide avant d'écrire, l'app valide avant d'afficher.
//
// Toute valeur météo peut être absente : elle vaut alors `null`, jamais une valeur par
// défaut. Un changement incompatible (champ retiré, renommé ou de sens différent) incrémente
// `SCHEMA_VERSION` ; un champ ajouté ne l'incrémente pas, et une app plus ancienne l'ignore.

import { z } from 'zod';

import { CITY_IDS } from './cities.ts';
import { CONDITIONS } from './conditions.ts';
import { MODEL_IDS } from './models.ts';

export const SCHEMA_VERSION = 1;

export const RELIABILITY_LABELS = ['sure', 'likely', 'uncertain'] as const;

/** Instant UTC, à la seconde : `2026-11-17T15:00:00Z`. */
const instant = z.iso.datetime();
/** Jour civil de Paris : `2026-11-17`. */
const day = z.iso.date();
const cityId = z.enum(CITY_IDS);
const modelId = z.enum(MODEL_IDS);
const condition = z.enum(CONDITIONS);

const value = z.number().nullable();
const positive = z.number().min(0).nullable();
const percent = z.number().min(0).max(100).nullable();
const degrees = z.number().min(0).max(360).nullable();
const count = z.number().int().min(0);

const hourlyForecastSchema = z.object({
  time: instant,
  /** °C. */
  temperature: value,
  /** Écart-type entre les modèles corrigés, en °C : leur désaccord. */
  temperatureSpread: positive,
  /** °C. */
  apparentTemperature: value,
  /** %. */
  humidity: percent,
  /** %. */
  cloudCover: percent,
  /** Cumul de l'heure écoulée, en mm. */
  precipitation: positive,
  /** Probabilité de pluie dans l'heure, en %. */
  precipitationProbability: percent,
  /** km/h. */
  windSpeed: positive,
  /** km/h. */
  windGusts: positive,
  /** Direction d'où vient le vent, en degrés. */
  windDirection: degrees,
  condition: condition.nullable(),
  isNight: z.boolean(),
  /** Ce que prévoit chaque modèle disponible à cette heure, corrigé de son biais. */
  models: z.partialRecord(modelId, z.object({ temperature: value, precipitation: positive })),
});

const dailyForecastSchema = z.object({
  date: day,
  /** Températures minimale et maximale du jour civil de Paris, en °C. */
  min: value,
  max: value,
  /** Températures ressenties minimale et maximale, en °C. */
  apparentMin: value,
  apparentMax: value,
  condition: condition.nullable(),
  /** Phrase courte produite par des règles (« Pluie dès 15 h »), ou `null` s'il n'y a rien à dire. */
  summary: z.string().min(1).nullable(),
  /** Cumul du jour, en mm. */
  precipitation: positive,
  /** Probabilité d'un jour de pluie, en %. */
  precipitationProbability: percent,
  /** Vent moyen et rafales les plus forts du jour, en km/h. */
  windSpeedMax: positive,
  windGustsMax: positive,
  /** Humidité moyenne du jour, en %. */
  humidity: percent,
  /** Indice de fiabilité, en % ; `null` tant que l'historique est insuffisant. */
  reliability: percent,
  reliabilityLabel: z.enum(RELIABILITY_LABELS).nullable(),
  /** Nombre de modèles proches de la valeur combinée, sur `modelsTotal` qui couvrent ce jour. */
  modelsAgreeing: count.nullable(),
  modelsTotal: count,
  /** Poids moyen de chaque modèle dans la température du jour ; leur somme vaut 1. */
  weights: z.partialRecord(modelId, z.number().min(0).max(1)),
});

export const forecastFileSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  city: cityId,
  /** Instant du calcul : c'est lui que l'app compare à l'heure courante. */
  generatedAt: instant,
  /** Un modèle absent de ce passage (panne, retard) y figure avec `available: false`. */
  models: z.array(z.object({ id: modelId, available: z.boolean() })),
  hourly: z.array(hourlyForecastSchema),
  daily: z.array(dailyForecastSchema),
});

const leadScoreSchema = z.object({
  /** Échéance, en jours. */
  leadDays: z.number().int().min(1),
  /** Nombre d'heures comparées. */
  count,
  /** Erreur absolue moyenne du mélange, en °C. */
  blend: positive,
  /** Meilleur modèle seul sur la même période, et son erreur. */
  bestModel: z.object({ id: modelId, error: z.number().min(0) }).nullable(),
  /** Erreur absolue moyenne de chaque modèle brut, en °C. */
  models: z.partialRecord(modelId, positive),
});

const comparedDaySchema = z.object({
  date: day,
  /** Ce qui était prévu la veille pour ce jour, en °C. */
  forecastMin: value,
  forecastMax: value,
  /** Ce qui a été mesuré, en °C. */
  observedMin: value,
  observedMax: value,
});

export const verificationFileSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  city: cityId,
  generatedAt: instant,
  /** Période sur laquelle portent les scores ; `null` tant que rien n'a pu être vérifié. */
  period: z.object({ from: day, to: day }).nullable(),
  temperature: z.object({
    byLead: z.array(leadScoreSchema),
    /** Prévu contre observé, jour par jour, sur les sept derniers jours vérifiés. */
    recentDays: z.array(comparedDaySchema),
  }),
  rain: z.object({
    /** Nombre de jours comparés. */
    count,
    /** Part des jours où l'annonce (pluie ou pas) était juste, en %. */
    hitRate: percent,
  }),
});

export type ForecastFile = z.infer<typeof forecastFileSchema>;
export type HourlyForecast = z.infer<typeof hourlyForecastSchema>;
export type DailyForecast = z.infer<typeof dailyForecastSchema>;
export type VerificationFile = z.infer<typeof verificationFileSchema>;
export type ReliabilityLabel = (typeof RELIABILITY_LABELS)[number];
