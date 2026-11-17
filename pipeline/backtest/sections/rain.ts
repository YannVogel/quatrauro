// Section « pluie » du rapport : réglage, annonce pluie / pas de pluie, probabilité, cumul.

import { MODELS } from '../config.ts';
import { evaluateRain } from '../evaluateRain.ts';
import type { RainLeadEvaluation, RainLevel } from '../evaluateRain.ts';
import type { LeadGrouping } from '../logic/grouping.ts';
import { formatInteger, formatNumber, formatPercent, markdownTable } from '../markdown.ts';
import {
  accuracy,
  brierScore,
  calibrationBins,
  criticalSuccessIndex,
  mergeContingencies,
} from '../rainScores.ts';
import type { Contingency } from '../rainScores.ts';
import { buildRainSettings, searchRain, selectRainCandidate } from '../searchRain.ts';
import type { RainCandidateResult } from '../searchRain.ts';
import type { RainSettings } from '../simulateRain.ts';
import { RAIN_MAX_ACCURACY_LOSS, RAIN_MAX_CSI_LOSS, isRainDegraded } from '../verdict.ts';
import { RANGES, formatRange } from './context.ts';
import type { Cities } from './context.ts';

/** Il « pleut » dans l'heure à partir de 0,2 mm (résolution du pluviomètre), dans la journée à partir de 1 mm. */
export const RAIN_THRESHOLDS: Readonly<Record<RainLevel, number>> = { hourly: 0.2, daily: 1 };

const LEVEL_LABELS: Readonly<Record<RainLevel, string>> = {
  hourly: 'À l’heure',
  daily: 'À la journée',
};
const PROBABILITY_BOUNDS = [0, 0.1, 0.3, 0.5, 0.7, 0.9, 1] as const;

export type RainSelection = {
  readonly settings: Readonly<Record<RainLevel, RainSettings>>;
  readonly markdown: string;
};

function candidateTable(
  results: readonly RainCandidateResult[],
  selected: RainCandidateResult,
): string {
  return markdownTable(
    [
      'A priori (cas fictifs)',
      'Seuil d’annonce',
      'Score de Brier',
      'Bonnes annonces',
      'Indice de succès critique',
      '',
    ],
    results.map((result) => [
      String(result.priorStrength),
      formatPercent(result.announcementProbability),
      formatNumber(result.brier, 4),
      formatPercent(result.accuracy, 1),
      formatNumber(result.csi, 3),
      result === selected ? '**retenu**' : '',
    ]),
  );
}

export function selectRainSettings(cities: Cities, leadGrouping: LeadGrouping): RainSelection {
  const lines: string[] = [
    '## Pluie',
    '',
    'La probabilité de pluie vient de l’accord entre modèles (la part d’entre eux qui annonce de la pluie), calibrée sur la fréquence observée dans le passé pour le même degré d’accord. Le mélange annonce de la pluie quand cette probabilité atteint un seuil d’annonce. Le cumul est la moyenne simple des modèles.',
    '',
    `Il « pleut » dans l'heure à partir de ${formatNumber(RAIN_THRESHOLDS.hourly, 1)} mm (la résolution du pluviomètre), dans la journée à partir de ${formatNumber(RAIN_THRESHOLDS.daily, 0)} mm.`,
    '',
    `### Réglage, sur la période de sélection (${formatRange(RANGES.selection)})`,
    '',
    'Deux villes et toutes échéances confondues. On retient l’a priori qui donne le meilleur score de Brier, puis le seuil d’annonce qui donne le meilleur indice de succès critique (à 0,005 près, celui qui donne le plus de bonnes annonces).',
    '',
  ];
  const settings = {} as Record<RainLevel, RainSettings>;
  for (const level of ['daily', 'hourly'] as const) {
    const results = searchRain(
      level,
      cities,
      MODELS,
      leadGrouping,
      RAIN_THRESHOLDS[level],
      RANGES.selection,
    );
    const selected = selectRainCandidate(results);
    settings[level] = buildRainSettings(
      leadGrouping,
      RAIN_THRESHOLDS[level],
      selected.priorStrength,
      selected.announcementProbability,
    );
    lines.push(`**${LEVEL_LABELS[level]}**`, '', candidateTable(results, selected), '');
  }
  return { settings, markdown: lines.join('\n') };
}

const describe = (table: Contingency): string[] => [
  formatPercent(accuracy(table), 1),
  formatNumber(criticalSuccessIndex(table), 3),
];

function leadTable(evaluations: readonly RainLeadEvaluation[]): string {
  const row = (
    label: string,
    count: number,
    rainy: number,
    blend: Contingency,
    best: Contingency,
    mean: Contingency,
    brier: string[],
  ): string[] => [
    label,
    formatInteger(count),
    formatInteger(rainy),
    ...describe(blend).map((cell) => `**${cell}**`),
    ...describe(best),
    ...describe(mean),
    ...brier,
  ];
  const probabilities = evaluations.flatMap((evaluation) => evaluation.probabilities);
  const outcomes = evaluations.flatMap((evaluation) => evaluation.outcomes);
  return markdownTable(
    [
      'Échéance',
      'Cas notés',
      'Avec pluie',
      'Mélange : bonnes annonces',
      'Mélange : ISC',
      'Meilleur seul : bonnes annonces',
      'Meilleur seul : ISC',
      'Moyenne simple : bonnes annonces',
      'Moyenne simple : ISC',
      'Brier mélange',
      'Brier meilleur seul',
      'Brier climatologie',
    ],
    [
      ...evaluations.map((evaluation) =>
        row(
          `J+${evaluation.lead}`,
          evaluation.count,
          evaluation.rainyCount,
          evaluation.blend,
          evaluation.bestPrevious,
          evaluation.simpleMean,
          [
            formatNumber(evaluation.brier.blend, 4),
            formatNumber(evaluation.brier.bestPrevious, 4),
            formatNumber(evaluation.brier.climatology, 4),
          ],
        ),
      ),
      row(
        '**Toutes**',
        evaluations.reduce((sum, evaluation) => sum + evaluation.count, 0),
        evaluations.reduce((sum, evaluation) => sum + evaluation.rainyCount, 0),
        mergeContingencies(evaluations.map((evaluation) => evaluation.blend)),
        mergeContingencies(evaluations.map((evaluation) => evaluation.bestPrevious)),
        mergeContingencies(evaluations.map((evaluation) => evaluation.simpleMean)),
        [formatNumber(brierScore(probabilities, outcomes), 4), '', ''],
      ),
    ],
  );
}

function calibrationTable(evaluations: readonly RainLeadEvaluation[]): string {
  const bins = calibrationBins(
    evaluations.flatMap((evaluation) => evaluation.probabilities),
    evaluations.flatMap((evaluation) => evaluation.outcomes),
    PROBABILITY_BOUNDS,
  );
  return markdownTable(
    ['Probabilité annoncée', 'Cas', 'Annonce moyenne', 'Fréquence observée'],
    bins.map((bin) => [
      `${formatPercent(bin.from)} à ${formatPercent(bin.to)}`,
      formatInteger(bin.count),
      formatPercent(bin.announced),
      formatPercent(bin.observed),
    ]),
  );
}

function amountTable(evaluations: readonly RainLeadEvaluation[]): string {
  return markdownTable(
    ['Échéance', 'Moyenne simple', 'Meilleur seul, fenêtre précédente'],
    evaluations.map((evaluation) => [
      `J+${evaluation.lead}`,
      formatNumber(evaluation.amountError.simpleMean),
      formatNumber(evaluation.amountError.bestPrevious),
    ]),
  );
}

export type RainCityVerdict = {
  readonly city: string;
  readonly degraded: boolean;
  readonly blend: Contingency;
  readonly bestPrevious: Contingency;
};

export function rainSection(
  cities: Cities,
  settings: Readonly<Record<RainLevel, RainSettings>>,
): { readonly markdown: string; readonly verdicts: RainCityVerdict[] } {
  const lines: string[] = [
    `### Résultats, sur la période de validation (${formatRange(RANGES.validation)})`,
    '',
    '« Bonnes annonces » : part des cas où l’annonce (pluie ou pas) était juste. « ISC », indice de succès critique : parmi les cas où la pluie a été annoncée ou observée, part de ceux où elle a été annoncée et observée ; il n’est pas gonflé par les nombreux cas secs. « Meilleur seul » : le modèle au cumul le plus précis sur les 30 jours précédant l’émission. Score de Brier : plus il est bas, meilleure est la probabilité ; « climatologie » annonce toujours la fréquence moyenne de la période.',
    '',
  ];
  const verdicts: RainCityVerdict[] = [];
  for (const data of cities) {
    lines.push(`#### ${data.city.name}`, '');
    for (const level of ['daily', 'hourly'] as const) {
      const evaluations = evaluateRain(level, data, MODELS, settings[level], RANGES.validation);
      lines.push(
        `**${LEVEL_LABELS[level]}** (seuil d'annonce : ${formatPercent(settings[level].announcementProbability)})`,
        '',
        leadTable(evaluations),
        '',
      );
      lines.push(
        'Calibration de la probabilité, toutes échéances confondues :',
        '',
        calibrationTable(evaluations),
        '',
      );
      if (level === 'daily') {
        const blend = mergeContingencies(evaluations.map((evaluation) => evaluation.blend));
        const bestPrevious = mergeContingencies(
          evaluations.map((evaluation) => evaluation.bestPrevious),
        );
        const degraded = isRainDegraded(
          { accuracy: accuracy(blend), csi: criticalSuccessIndex(blend) },
          { accuracy: accuracy(bestPrevious), csi: criticalSuccessIndex(bestPrevious) },
        );
        verdicts.push({ city: data.city.name, degraded, blend, bestPrevious });
        lines.push(
          'Erreur absolue moyenne du cumul quotidien (mm) :',
          '',
          amountTable(evaluations),
          '',
        );
      }
    }
    const year = evaluateRain('daily', data, MODELS, settings.daily, RANGES.year);
    lines.push(
      `**À la journée, année entière** (${formatRange(RANGES.year)}), pour information :`,
      '',
      leadTable(year),
      '',
    );
  }
  lines.push(
    `Critère « sans dégrader la pluie », fixé avant de lire les résultats : à la journée, toutes échéances confondues, le mélange ne perd pas plus de ${formatNumber(RAIN_MAX_ACCURACY_LOSS * 100, 0)} point de bonnes annonces ni plus de ${formatNumber(RAIN_MAX_CSI_LOSS, 2)} d'indice de succès critique face au meilleur modèle seul.`,
    '',
    markdownTable(
      [
        'Ville',
        'Mélange : bonnes annonces',
        'Mélange : ISC',
        'Meilleur seul : bonnes annonces',
        'Meilleur seul : ISC',
        'Pluie dégradée ?',
      ],
      verdicts.map((verdict) => [
        verdict.city,
        ...describe(verdict.blend),
        ...describe(verdict.bestPrevious),
        verdict.degraded ? '**oui**' : 'non',
      ]),
    ),
    '',
  );
  return { markdown: lines.join('\n'), verdicts };
}
