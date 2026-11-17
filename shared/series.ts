// Séries internes du pipeline : ce que la collecte rend, avant tout calcul. Les instants sont
// des heures rondes en UTC ; une valeur absente vaut `null`.

import type { DecayedMean } from './blend/decayedMean.ts';
import type { CityId } from './cities.ts';
import type { ModelId } from './models.ts';
import type { ForecastVariable } from './variables.ts';

export type HourlySeries = {
  /** Heures rondes, en UTC, au format ISO (`2026-11-17T15:00:00Z`), dans l'ordre. */
  readonly times: readonly string[];
  /** Pour chaque variable, une valeur par heure de `times`. */
  readonly values: Readonly<Record<ForecastVariable, readonly (number | null)[]>>;
};

/** Prévision d'un modèle pour une ville. */
export type ModelForecast = HourlySeries & { readonly modelId: ModelId };

/** Ce qu'un passage de la collecte a obtenu pour une ville. */
export type CityForecasts = {
  readonly cityId: CityId;
  /** Instant de la collecte, en UTC. */
  readonly collectedAt: string;
  readonly forecasts: readonly ModelForecast[];
  /** Modèles qui n'ont rien rendu à ce passage : ils sont ignorés, et signalés dans le fichier publié. */
  readonly unavailable: readonly ModelId[];
};

/** Mesures horaires de la station de référence d'une ville. */
export type Observations = HourlySeries & { readonly stationId: string };

/** Ce qu'on sait d'un modèle pour une variable, une tranche d'échéance et une heure de la journée. */
export type ModelState = {
  /** Écart moyen récent entre sa prévision et l'observation. */
  readonly bias: DecayedMean;
  /** Erreur absolue moyenne récente de sa prévision corrigée : elle fixe son poids. */
  readonly error: DecayedMean;
};
