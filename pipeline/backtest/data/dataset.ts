// Jeu de données du backtest : observations et prévisions de chaque ville, sur un axe horaire commun.

import { MAX_LEAD_DAYS } from '../config.ts';
import type { City, Model, Variable, VariableId } from '../config.ts';
import { createHourAxis } from './hours.ts';
import type { HourAxis } from './hours.ts';
import { loadObservations } from './meteoFrance.ts';
import type { Observations } from './meteoFrance.ts';
import { loadForecasts } from './openMeteo.ts';
import type { Period } from './openMeteo.ts';

/** `forecasts[variable][modèle][échéance − 1]` : une série horaire, ou `undefined` au-delà de la portée du modèle. */
export type Forecasts = Record<VariableId, Record<string, readonly Float64Array[]>>;

export type CityData = {
  readonly city: City;
  readonly axis: HourAxis;
  readonly observations: Observations;
  readonly forecasts: Forecasts;
};

export async function loadCityData(
  cacheDir: string,
  city: City,
  models: readonly Model[],
  variables: readonly Variable[],
  period: Period,
  onProgress: (message: string) => void,
): Promise<CityData> {
  const axis = createHourAxis(period.start, period.end);
  const observations = await loadObservations(cacheDir, city, variables, axis);
  onProgress(`${city.name} : observations lues`);

  const forecasts = {} as Forecasts;
  for (const variable of variables) {
    forecasts[variable.id] = {};
    for (const model of models) {
      if (model.historyLeadDays > MAX_LEAD_DAYS) throw new Error(`Portée inattendue pour ${model.id}`);
      forecasts[variable.id][model.id] = await loadForecasts(cacheDir, city, model, variable, period, axis);
      onProgress(`${city.name} : ${model.name}, ${variable.label.toLowerCase()}`);
    }
  }
  return { city, axis, observations, forecasts };
}
