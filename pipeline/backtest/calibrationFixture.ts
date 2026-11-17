// Jeu de données de calibration : la situation de chaque jour du backtest (désaccord entre
// modèles, probabilité de pluie, prévision tenue ou non), par ville et par échéance. Il est
// dérivé de prévisions et d'observations réelles par `npm run backtest`, et permet de rejouer
// l'indice de fiabilité dans les tests sans retélécharger l'historique.

import type { ReliabilityRun } from './evaluateReliability.ts';
import { daysOf } from './evaluateReliability.ts';
import type { DateRange } from './evaluate.ts';
import type { ReliabilityDays, ReliabilitySettings } from './simulateReliability.ts';

export const CALIBRATION_FIXTURE_PATH = 'pipeline/__fixtures__/backtest/reliability-days.json';

/** Dans le fichier, une valeur absente vaut `null`. */
type FixtureDays = {
  readonly modelCount: number;
  readonly spread: readonly (number | null)[];
  readonly rainProbability: readonly (number | null)[];
  readonly held: readonly (number | null)[];
};

export type CalibrationFixture = {
  readonly description: string;
  /** Premier et dernier jour (UTC) des séries. */
  readonly period: { readonly start: string; readonly end: string };
  /** Réglages avec lesquels « prévision tenue » a été établi : le test vérifie qu'ils sont encore en vigueur. */
  readonly derivedWith: {
    readonly temperatureTolerance: number;
    readonly rainThreshold: number;
    readonly rainAnnouncementProbability: number;
  };
  /** Période de validation, en positions de jour : `from` compris, `to` exclu. */
  readonly validationDays: { readonly from: number; readonly to: number };
  /** Par ville, puis par échéance en jours. */
  readonly cities: Readonly<Record<string, Readonly<Record<string, FixtureDays>>>>;
};

const toNullable = (series: Float64Array): (number | null)[] =>
  Array.from(series, (value) => (Number.isFinite(value) ? value : null));
const fromNullable = (values: readonly (number | null)[]): Float64Array =>
  Float64Array.from(values, (value) => value ?? Number.NaN);

export function buildCalibrationFixture(
  runs: readonly ReliabilityRun[],
  settings: ReliabilitySettings,
  period: { readonly start: string; readonly end: string },
  validation: DateRange,
): CalibrationFixture {
  const [first] = runs;
  if (first === undefined) throw new Error('Aucune ville simulée');
  const days = daysOf(first, validation);
  return {
    description:
      'Situation quotidienne du backtest, par ville et par échéance. Généré par `npm run backtest` à partir de prévisions et d’observations réelles : ne pas modifier à la main.',
    period,
    derivedWith: {
      temperatureTolerance: settings.temperatureTolerance,
      rainThreshold: settings.rainThreshold,
      rainAnnouncementProbability: settings.rainAnnouncementProbability,
    },
    validationDays: { from: days[0] ?? 0, to: (days.at(-1) ?? -1) + 1 },
    cities: Object.fromEntries(
      runs.map((run) => [
        run.data.city.id,
        Object.fromEntries(
          [...run.byLead].map(([lead, series]) => [
            String(lead),
            {
              modelCount: series.modelCount,
              spread: toNullable(series.spread),
              rainProbability: toNullable(series.rainProbability),
              held: toNullable(series.held),
            },
          ]),
        ),
      ]),
    ),
  };
}

/** Les séries d'une ville du fichier, telles que le rejeu les attend. */
export function daysByLead(
  city: Readonly<Record<string, FixtureDays>>,
): Map<number, ReliabilityDays> {
  return new Map(
    Object.entries(city).map(([lead, days]) => [
      Number(lead),
      {
        modelCount: days.modelCount,
        spread: fromNullable(days.spread),
        rainProbability: fromNullable(days.rainProbability),
        held: fromNullable(days.held),
      },
    ]),
  );
}
