// Historique lu par le backtest (prévisions passées d'Open-Meteo par échéance, mesures de
// Météo-France), présenté au rejeu de l'amorçage.

import { MAX_LEAD_DAYS } from '../../shared/blendConfig.ts';
import type { ConfiguredModel } from '../../shared/models.ts';
import { FORECAST_VARIABLES } from '../../shared/variables.ts';
import type { ForecastVariable } from '../../shared/variables.ts';
import type { Measures } from '../archive/observations.ts';
import type { CityData } from '../backtest/data/dataset.ts';
import type { ModelValues } from '../blend/hour.ts';
import { HOUR_MS } from '../instant.ts';
import type { History } from './replay.ts';

const finite = (value: number | undefined): number | null =>
  value !== undefined && Number.isFinite(value) ? value : null;

/**
 * L'historique ne contient pas la direction du vent : elle n'est ni corrigée ni vérifiée, et
 * l'amorçage n'en a pas besoin. Elle vaut `null` partout.
 */
export function historyFromBacktest(data: CityData, models: readonly ConfiguredModel[]): History {
  const { axis } = data;
  const firstHour = axis.startHour * HOUR_MS;
  const positionOf = (time: number): number => time / HOUR_MS - axis.startHour;
  const seriesOf = (variable: ForecastVariable): Record<string, readonly Float64Array[]> =>
    variable === 'windDirection' ? {} : (data.forecasts[variable] ?? {});

  const observations = new Map<number, Measures>();
  for (let position = 0; position < axis.length; position += 1) {
    const measures = Object.fromEntries(
      FORECAST_VARIABLES.map((variable) => [
        variable,
        variable === 'windDirection' ? null : finite(data.observations[variable]?.[position]),
      ]),
    ) as Record<ForecastVariable, number | null>;
    if (Object.values(measures).some((value) => value !== null)) {
      observations.set(firstHour + position * HOUR_MS, measures);
    }
  }

  return {
    firstHour,
    lastHour: firstHour + (axis.length - 1) * HOUR_MS,
    observations,
    modelsAt: (time, lead) => {
      if (lead < 1 || lead > MAX_LEAD_DAYS) return [];
      const position = positionOf(time);
      return models.flatMap((model): ModelValues[] => {
        const values = Object.fromEntries(
          FORECAST_VARIABLES.map((variable) => [
            variable,
            finite(seriesOf(variable)[model.id]?.[lead - 1]?.[position]),
          ]),
        ) as Record<ForecastVariable, number | null>;
        return Object.values(values).some((value) => value !== null)
          ? [{ modelId: model.id, values }]
          : [];
      });
    },
  };
}
