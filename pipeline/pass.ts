// Un passage complet du pipeline : collecte, archive, vérification, mélange, publication, pour
// chaque ville. Tout se fait sur un stockage tampon, reporté à la fin seulement si tout a
// réussi : un passage en échec n'écrit rien, et les fichiers précédents restent en place.

import type { ConfiguredCity } from '../shared/cities.ts';
import type { ConfiguredModel } from '../shared/models.ts';
import type { ForecastFile, VerificationFile } from '../shared/schemas.ts';
import type { CityForecasts, Observations } from '../shared/series.ts';
import { collectForecasts } from './collect/forecasts.ts';
import { collectObservations } from './collect/observations.ts';
import type { CollectOptions } from './collect/options.ts';
import { OBSERVATION_LOOKBACK_DAYS } from './config.ts';
import { DAY_MS } from './instant.ts';
import { buildForecastFile } from './publish/forecast.ts';
import { publishCity } from './publish/publish.ts';
import { bufferedStorage } from './storage.ts';
import type { Storage } from './storage.ts';
import { archiveAndVerify } from './verify/step.ts';

/** D'où viennent les données d'un passage : le réseau en production, un scénario dans les tests. */
export type Collectors = {
  readonly forecasts: (city: ConfiguredCity) => Promise<CityForecasts>;
  readonly observations: (
    city: ConfiguredCity,
    window: { readonly from: Date; readonly to: Date },
  ) => Promise<Observations>;
};

/** Collecte réelle : Open-Meteo pour les prévisions, Météo-France pour les mesures. */
export function httpCollectors(
  models: readonly ConfiguredModel[],
  options: CollectOptions,
): Collectors {
  return {
    forecasts: (city) => collectForecasts(city, models, options),
    observations: (city, window) => collectObservations(city, window, options),
  };
}

export type PassOptions = {
  readonly storage: Storage;
  readonly cities: readonly ConfiguredCity[];
  readonly collectors: Collectors;
  /** Instant du passage : toutes les villes portent le même. */
  readonly collectedAt: Date;
  readonly log: (message: string) => void;
  /** À blanc : tout calculer, ne rien écrire. */
  readonly dryRun: boolean;
};

export type PublishedCity = {
  readonly forecast: ForecastFile;
  readonly verification: VerificationFile;
};

export type PassResult = {
  readonly cities: readonly PublishedCity[];
  /** Fichiers écrits, ou qui l'auraient été à blanc. */
  readonly files: readonly string[];
};

/**
 * Lance un passage. Lève une erreur au premier échec (collecte, archive, fichier invalide) :
 * rien n'est alors écrit, pour aucune ville.
 */
export async function runPass(options: PassOptions): Promise<PassResult> {
  const { cities, collectors, collectedAt, log } = options;
  const storage = bufferedStorage(options.storage);
  const published: PublishedCity[] = [];

  for (const city of cities) {
    const forecasts = await collectors.forecasts(city);
    const used = forecasts.forecasts.map((forecast) => forecast.modelId);
    log(
      `${city.name} : modèles utilisés : ${used.join(', ')}` +
        (forecasts.unavailable.length === 0
          ? ''
          : ` ; absents : ${forecasts.unavailable.join(', ')}`),
    );
    const observations = await collectors.observations(city, {
      from: new Date(collectedAt.getTime() - OBSERVATION_LOOKBACK_DAYS * DAY_MS),
      to: collectedAt,
    });
    const { state, verification } = await archiveAndVerify(
      storage,
      city,
      { forecasts, observations },
      log,
    );
    const forecast = buildForecastFile(city, forecasts, state);
    await publishCity(storage, { forecast, verification });
    log(
      `${city.name} : ${forecast.hourly.length} heures et ${forecast.daily.length} jours prêts à publier`,
    );
    published.push({ forecast, verification });
  }

  const files = storage.pending();
  if (options.dryRun) {
    log(`Passage à blanc : ${files.length} fichiers calculés, aucun écrit`);
  } else {
    await storage.commit();
    log(`${files.length} fichiers écrits`);
  }
  return { cities: published, files };
}
