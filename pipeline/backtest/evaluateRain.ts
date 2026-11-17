// Évalue l'annonce de pluie du mélange et de ses références, à l'heure et à la journée.

import type { Model } from './config.ts';
import { bestModelOnPreviousWindow } from './baselines.ts';
import type { CityData } from './data/dataset.ts';
import { HOURS_PER_DAY } from './data/hours.ts';
import { dailySum } from './daily.ts';
import { BEST_MODEL_WINDOW, buildInput, leadsToEvaluate, positionsOf } from './evaluate.ts';
import type { DateRange } from './evaluate.ts';
import { EMPTY_CONTINGENCY, addToContingency, brierScore } from './rainScores.ts';
import type { Contingency } from './rainScores.ts';
import { commonPositions, scoreSeries } from './score.ts';
import { simulateDailyRain, simulateHourlyRain } from './simulateRain.ts';
import type { RainSettings } from './simulateRain.ts';

export type RainLevel = 'hourly' | 'daily';

export type RainLeadEvaluation = {
  readonly lead: number;
  readonly count: number;
  readonly rainyCount: number;
  /** Annonce du mélange : pluie si la probabilité calibrée atteint le seuil d'annonce. */
  readonly blend: Contingency;
  /** Annonce du meilleur modèle seul désigné à l'émission. */
  readonly bestPrevious: Contingency;
  /** Annonce tirée de la moyenne simple des cumuls. */
  readonly simpleMean: Contingency;
  readonly models: Readonly<Record<string, Contingency>>;
  readonly brier: {
    readonly blend: number;
    readonly bestPrevious: number;
    readonly climatology: number;
  };
  /** Erreur absolue moyenne du cumul, en mm. */
  readonly amountError: { readonly simpleMean: number; readonly bestPrevious: number };
  readonly probabilities: readonly number[];
  readonly outcomes: readonly boolean[];
};

function contingencyOf(
  amounts: Float64Array,
  observation: Float64Array,
  positions: readonly number[],
  announces: (value: number) => boolean,
  threshold: number,
): Contingency {
  return positions.reduce(
    (table, position) =>
      addToContingency(
        table,
        announces(amounts[position] ?? Number.NaN),
        (observation[position] ?? Number.NaN) >= threshold,
      ),
    EMPTY_CONTINGENCY,
  );
}

export function evaluateRain(
  level: RainLevel,
  data: CityData,
  models: readonly Model[],
  settings: RainSettings,
  range: DateRange,
): RainLeadEvaluation[] {
  const input = buildInput(data, 'precipitation', models);
  const daily = level === 'daily';
  const toLevel = (series: Float64Array): Float64Array => (daily ? dailySum(series) : series);
  const observation = toLevel(input.observation);
  const simulation = daily
    ? simulateDailyRain(input, settings)
    : simulateHourlyRain(input, settings);
  const hours = positionsOf(input.axis, range);
  const from = daily ? hours.from / HOURS_PER_DAY : hours.from;
  const to = daily ? hours.to / HOURS_PER_DAY : hours.to;
  const rains = (amount: number): boolean => amount >= settings.threshold;

  return leadsToEvaluate(models).map((lead) => {
    const result = simulation.get(lead);
    if (result === undefined) throw new Error(`Échéance J+${lead} non simulée`);
    const expected = models
      .map((model, index) => ({ model, series: input.forecasts[index]?.[lead - 1] }))
      .filter((entry) => entry.model.historyLeadDays >= lead)
      .map((entry) => {
        if (entry.series === undefined)
          throw new Error(`Série absente pour ${entry.model.id} à J+${lead}`);
        return { id: entry.model.id, series: toLevel(entry.series) };
      });
    const bestPrevious = toLevel(bestModelOnPreviousWindow(input, lead, BEST_MODEL_WINDOW));
    const positions = commonPositions(
      [
        ...expected.map((entry) => entry.series),
        bestPrevious,
        result.probability,
        result.meanAmount,
      ],
      observation,
      from,
      to,
    );
    const outcomes = positions.map((position) => rains(observation[position] ?? Number.NaN));
    const probabilities = positions.map((position) => result.probability[position] ?? Number.NaN);
    const rainyCount = outcomes.filter(Boolean).length;
    const climatology = rainyCount / positions.length;

    return {
      lead,
      count: positions.length,
      rainyCount,
      blend: contingencyOf(
        result.probability,
        observation,
        positions,
        (p) => p >= settings.announcementProbability,
        settings.threshold,
      ),
      bestPrevious: contingencyOf(bestPrevious, observation, positions, rains, settings.threshold),
      simpleMean: contingencyOf(
        result.meanAmount,
        observation,
        positions,
        rains,
        settings.threshold,
      ),
      models: Object.fromEntries(
        expected.map((entry) => [
          entry.id,
          contingencyOf(entry.series, observation, positions, rains, settings.threshold),
        ]),
      ),
      brier: {
        blend: brierScore(probabilities, outcomes),
        bestPrevious: brierScore(
          positions.map((position) => (rains(bestPrevious[position] ?? Number.NaN) ? 1 : 0)),
          outcomes,
        ),
        climatology: brierScore(
          positions.map(() => climatology),
          outcomes,
        ),
      },
      amountError: {
        simpleMean: scoreSeries(result.meanAmount, observation, positions).mae,
        bestPrevious: scoreSeries(bestPrevious, observation, positions).mae,
      },
      probabilities,
      outcomes,
    };
  });
}
