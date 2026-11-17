// Évalue le mélange d'une variable continue et ses références, échéance par échéance,
// sur les mêmes heures pour toutes les méthodes.

import { BLEND_CONFIG, MAX_LEAD_DAYS } from '../../shared/blendConfig.ts';
import type { Model } from '../../shared/models.ts';
import type { VariableId } from './config.ts';
import { bestModelOnPreviousWindow, simpleMean } from './baselines.ts';
import type { CityData } from './data/dataset.ts';
import { hourOfDate } from './data/hours.ts';
import type { HourAxis } from './data/hours.ts';
import type { BlendParams } from './logic/params.ts';
import { commonPositions, scoreSeries } from './score.ts';
import type { Score } from './score.ts';
import { simulateBlend } from './simulate.ts';
import type { LeadSimulation, SimulationInput } from './simulate.ts';

/** Fenêtre qui désigne le « meilleur modèle seul » : indépendante des paramètres du mélange. */
export const BEST_MODEL_WINDOW = { windowDays: 30, minSamples: 72 } as const;

export type DateRange = { readonly from: string; readonly to: string };

export type LeadEvaluation = {
  readonly lead: number;
  /** Modèles attendus à cette échéance, d'après la portée de l'historique. */
  readonly models: readonly string[];
  readonly count: number;
  readonly blend: Score;
  readonly simpleMean: Score;
  /** Meilleur modèle brut désigné à l'émission, sur la fenêtre précédente. */
  readonly bestPrevious: Score;
  /** Meilleur modèle brut connu après coup, sur toute la période notée. */
  readonly bestAfterTheFact: { readonly model: string; readonly score: Score };
  readonly raw: Readonly<Record<string, Score>>;
  readonly corrected: Readonly<Record<string, Score>>;
};

export type Baselines = { readonly simpleMean: Float64Array; readonly bestPrevious: Float64Array };

export function buildInput(
  data: CityData,
  variable: VariableId,
  models: readonly Model[],
): SimulationInput {
  return {
    axis: data.axis,
    observation: data.observations[variable],
    forecasts: models.map((model) => data.forecasts[variable][model.id] ?? []),
    observationDelayHours: BLEND_CONFIG.observationDelayHours,
  };
}

/** Positions de l'axe couvertes par un intervalle de dates, borne de fin comprise. */
export function positionsOf(
  axis: HourAxis,
  range: DateRange,
): { readonly from: number; readonly to: number } {
  return {
    from: hourOfDate(range.from) - axis.startHour,
    to: hourOfDate(range.to) + 24 - axis.startHour,
  };
}

export function leadsToEvaluate(models: readonly Model[]): number[] {
  const leads: number[] = [];
  for (let lead = 1; lead <= MAX_LEAD_DAYS; lead += 1) {
    // Un mélange n'a de sens qu'avec au moins deux modèles.
    if (models.filter((model) => model.historyLeadDays >= lead).length >= 2) leads.push(lead);
  }
  return leads;
}

export function computeBaselines(
  input: SimulationInput,
  leads: readonly number[],
): Map<number, Baselines> {
  return new Map(
    leads.map((lead) => [
      lead,
      {
        simpleMean: simpleMean(input, lead),
        bestPrevious: bestModelOnPreviousWindow(input, lead, BEST_MODEL_WINDOW),
      },
    ]),
  );
}

export function evaluateLead(
  input: SimulationInput,
  models: readonly Model[],
  lead: number,
  simulation: LeadSimulation,
  baselines: Baselines,
  range: DateRange,
): LeadEvaluation {
  const expected = models
    .map((model, index) => ({
      model,
      raw: input.forecasts[index]?.[lead - 1],
      corrected: simulation.corrected[index],
    }))
    .filter((entry) => entry.model.historyLeadDays >= lead);
  const rawSeries = expected.map((entry) => {
    if (entry.raw === undefined)
      throw new Error(`Série absente pour ${entry.model.id} à J+${lead}`);
    return entry.raw;
  });
  const { from, to } = positionsOf(input.axis, range);
  const positions = commonPositions(
    [...rawSeries, simulation.blend, baselines.simpleMean, baselines.bestPrevious],
    input.observation,
    from,
    to,
  );
  const score = (series: Float64Array): Score => scoreSeries(series, input.observation, positions);

  const raw = Object.fromEntries(
    expected.map((entry, index) => [entry.model.id, score(rawSeries[index] ?? new Float64Array())]),
  );
  const corrected = Object.fromEntries(
    expected.map((entry) => [entry.model.id, score(entry.corrected ?? new Float64Array())]),
  );
  const [bestModel, bestScore] = Object.entries(raw).reduce((best, current) =>
    current[1].mae < best[1].mae ? current : best,
  );

  return {
    lead,
    models: expected.map((entry) => entry.model.id),
    count: positions.length,
    blend: score(simulation.blend),
    simpleMean: score(baselines.simpleMean),
    bestPrevious: score(baselines.bestPrevious),
    bestAfterTheFact: { model: bestModel, score: bestScore },
    raw,
    corrected,
  };
}

export function evaluateContinuous(
  data: CityData,
  variable: VariableId,
  models: readonly Model[],
  params: BlendParams,
  range: DateRange,
): LeadEvaluation[] {
  const input = buildInput(data, variable, models);
  const leads = leadsToEvaluate(models);
  const baselines = computeBaselines(input, leads);
  const simulation = simulateBlend(input, params);
  return leads.map((lead) => {
    const leadSimulation = simulation.get(lead);
    const leadBaselines = baselines.get(lead);
    if (leadSimulation === undefined || leadBaselines === undefined)
      throw new Error(`Échéance J+${lead} non simulée`);
    return evaluateLead(input, models, lead, leadSimulation, leadBaselines, range);
  });
}
