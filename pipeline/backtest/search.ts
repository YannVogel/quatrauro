// Recherche des paramètres du mélange : on essaie une grille de valeurs et on garde la
// combinaison qui donne la plus petite erreur sur la période de sélection.

import { BLEND_CONFIG } from '../../shared/blendConfig.ts';
import type { Model } from '../../shared/models.ts';
import type { VariableId } from './config.ts';
import type { CityData } from './data/dataset.ts';
import { buildInput, computeBaselines, evaluateLead, leadsToEvaluate } from './evaluate.ts';
import type { DateRange } from './evaluate.ts';
import type { LeadGrouping } from '../../shared/blend/grouping.ts';
import type { BlendParams } from './logic/params.ts';
import { simulateBlend } from './simulate.ts';

export const LEAD_GROUPINGS: Readonly<Record<string, LeadGrouping>> = {
  'par jour': [[1], [2], [3], [4], [5], [6], [7]],
  'J+4–5 et J+6–7 regroupés': [[1], [2], [3], [4, 5], [6, 7]],
};

export const GRID = {
  biasHalfLifeDays: [5, 10, 20, 40],
  errorHalfLifeDays: [10, 30, 60, 120],
  weightExponent: [0, 1, 2, 4, 8],
  hourBlocksPerDay: [1, 4, 8, 24],
  leadGrouping: Object.keys(LEAD_GROUPINGS),
} as const;

/** Réglages que la grille n'explore pas : ceux en vigueur. */
export const FIXED_PARAMS = {
  minSamples: BLEND_CONFIG.corrected.minSamples,
  errorFloor: BLEND_CONFIG.corrected.errorFloor,
} as const;

export type Candidate = {
  readonly biasHalfLifeDays: number;
  readonly errorHalfLifeDays: number;
  readonly weightExponent: number;
  readonly hourBlocksPerDay: number;
  readonly leadGrouping: string;
};

export type CandidateResult = { readonly candidate: Candidate; readonly meanError: number };

export function toParams(candidate: Candidate): BlendParams {
  const leadGrouping = LEAD_GROUPINGS[candidate.leadGrouping];
  if (leadGrouping === undefined) throw new Error(`Découpage inconnu : ${candidate.leadGrouping}`);
  return { ...candidate, leadGrouping, ...FIXED_PARAMS };
}

export function enumerateCandidates(): Candidate[] {
  const candidates: Candidate[] = [];
  for (const biasHalfLifeDays of GRID.biasHalfLifeDays)
    for (const errorHalfLifeDays of GRID.errorHalfLifeDays)
      for (const weightExponent of GRID.weightExponent)
        for (const hourBlocksPerDay of GRID.hourBlocksPerDay)
          for (const leadGrouping of GRID.leadGrouping)
            candidates.push({
              biasHalfLifeDays,
              errorHalfLifeDays,
              weightExponent,
              hourBlocksPerDay,
              leadGrouping,
            });
  return candidates;
}

/**
 * Erreur absolue moyenne du mélange pour chaque candidat, moyennée sur les villes et les
 * échéances (chaque couple ville-échéance compte autant). Résultats triés, le meilleur d'abord.
 */
export function searchParams(
  cities: readonly CityData[],
  variable: VariableId,
  models: readonly Model[],
  range: DateRange,
  candidates: readonly Candidate[] = enumerateCandidates(),
): CandidateResult[] {
  const leads = leadsToEvaluate(models);
  const prepared = cities.map((data) => {
    const input = buildInput(data, variable, models);
    return { input, baselines: computeBaselines(input, leads) };
  });

  const results = candidates.map((candidate) => {
    const params = toParams(candidate);
    let total = 0;
    let terms = 0;
    for (const { input, baselines } of prepared) {
      const simulation = simulateBlend(input, params);
      for (const lead of leads) {
        const leadSimulation = simulation.get(lead);
        const leadBaselines = baselines.get(lead);
        if (leadSimulation === undefined || leadBaselines === undefined)
          throw new Error(`Échéance J+${lead} non simulée`);
        total += evaluateLead(input, models, lead, leadSimulation, leadBaselines, range).blend.mae;
        terms += 1;
      }
    }
    return { candidate, meanError: total / terms };
  });
  return results.sort((a, b) => a.meanError - b.meanError);
}

/**
 * Erreur moyenne des candidats pour chaque valeur d'un paramètre : l'effet propre de ce
 * paramètre. Les valeurs sont rendues dans l'ordre de la grille.
 */
export function marginalEffect(
  results: readonly CandidateResult[],
  parameter: keyof Candidate,
): Map<string, number> {
  const groups = new Map<string, number[]>(GRID[parameter].map((value) => [String(value), []]));
  for (const result of results)
    groups.get(String(result.candidate[parameter]))?.push(result.meanError);
  return new Map(
    [...groups]
      .filter(([, errors]) => errors.length > 0)
      .map(([key, errors]) => [key, errors.reduce((sum, error) => sum + error, 0) / errors.length]),
  );
}

/** Écart relatif en dessous duquel deux candidats sont tenus pour équivalents. */
export const TIE_TOLERANCE = 0.001;

/**
 * Candidat retenu : le meilleur, sauf si d'autres font aussi bien à `TIE_TOLERANCE` près.
 * Entre équivalents, on prend celui dont les poids réagissent le plus vite (fenêtre d'erreur
 * la plus courte), pour s'adapter plus tôt quand un modèle change.
 */
export function selectCandidate(results: readonly CandidateResult[]): CandidateResult {
  const best = results.reduce((a, b) => (b.meanError < a.meanError ? b : a));
  const tied = results.filter((result) => result.meanError <= best.meanError * (1 + TIE_TOLERANCE));
  return tied.reduce((a, b) => {
    if (b.candidate.errorHalfLifeDays !== a.candidate.errorHalfLifeDays) {
      return b.candidate.errorHalfLifeDays < a.candidate.errorHalfLifeDays ? b : a;
    }
    return b.meanError < a.meanError ? b : a;
  });
}
