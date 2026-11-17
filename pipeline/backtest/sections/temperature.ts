// Section « température » du rapport : choix des paramètres, résultats par échéance, verdict.

import { MODELS } from '../config.ts';
import type { Model } from '../config.ts';
import { evaluateContinuous } from '../evaluate.ts';
import type { LeadEvaluation } from '../evaluate.ts';
import type { BlendParams } from '../logic/params.ts';
import { formatGain, formatInteger, formatNumber, markdownTable } from '../markdown.ts';
import {
  GRID,
  TIE_TOLERANCE,
  marginalEffect,
  searchParams,
  selectCandidate,
  toParams,
} from '../search.ts';
import type { Candidate, CandidateResult } from '../search.ts';
import { TEMPERATURE_MIN_GAIN, gainOverBestPrevious, judgeTemperature } from '../verdict.ts';
import type { TemperatureVerdict } from '../verdict.ts';
import { RANGES, formatRange } from './context.ts';
import type { Cities } from './context.ts';

const PARAMETER_LABELS: Readonly<Record<keyof Candidate, string>> = {
  biasHalfLifeDays: 'Vitesse d’oubli du biais (demi-vie, jours)',
  errorHalfLifeDays: 'Fenêtre de l’erreur récente (demi-vie, jours)',
  weightExponent: 'Exposant des poids',
  hourBlocksPerDay: 'Blocs horaires par jour',
  leadGrouping: 'Découpage des échéances',
};

const TOP_CANDIDATES = 5;

export type Selection = {
  readonly selected: CandidateResult;
  readonly params: BlendParams;
  readonly markdown: string;
};

export function selectTemperatureParams(cities: Cities): Selection {
  const results = searchParams(cities, 'temperature', MODELS, RANGES.selection);
  const selected = selectCandidate(results);
  const best = results[0];
  const worst = results[results.length - 1];
  if (best === undefined || worst === undefined) throw new Error('Grille de paramètres vide');
  const describe = (candidate: Candidate): string[] =>
    (Object.keys(PARAMETER_LABELS) as (keyof Candidate)[]).map((key) => String(candidate[key]));

  const markdown = [
    '## Paramètres du mélange',
    '',
    `Grille de ${results.length} combinaisons, évaluée sur la **période de sélection** (${formatRange(RANGES.selection)}), température seule. La mesure est l'erreur absolue moyenne du mélange, moyennée sur les deux villes et les sept échéances.`,
    '',
    '### Combinaison retenue',
    '',
    markdownTable(
      ['Paramètre', 'Valeur retenue', 'Valeurs essayées'],
      (Object.keys(PARAMETER_LABELS) as (keyof Candidate)[]).map((key) => [
        PARAMETER_LABELS[key],
        `**${String(selected.candidate[key])}**`,
        GRID[key].join(', '),
      ]),
    ),
    '',
    `Erreur de la combinaison retenue : ${formatNumber(selected.meanError, 4)} °C. Meilleure de la grille : ${formatNumber(best.meanError, 4)} °C ; plus mauvaise : ${formatNumber(worst.meanError, 4)} °C. Deux combinaisons à moins de ${formatNumber(TIE_TOLERANCE * 100, 1)} % l'une de l'autre sont tenues pour équivalentes ; entre équivalentes, on garde la fenêtre d'erreur la plus courte.`,
    '',
    '### Les cinq meilleures combinaisons',
    '',
    markdownTable(
      [...Object.values(PARAMETER_LABELS), 'Erreur (°C)'],
      results
        .slice(0, TOP_CANDIDATES)
        .map((result) => [...describe(result.candidate), formatNumber(result.meanError, 4)]),
    ),
    '',
    '### Effet propre de chaque paramètre',
    '',
    'Erreur moyenne (°C) de toutes les combinaisons qui partagent une valeur du paramètre.',
    '',
    ...(Object.keys(PARAMETER_LABELS) as (keyof Candidate)[]).flatMap((key) => {
      const effect = marginalEffect(results, key);
      return [
        markdownTable(
          [PARAMETER_LABELS[key], ...effect.keys()],
          [['Erreur moyenne (°C)', ...[...effect.values()].map((value) => formatNumber(value, 4))]],
        ),
        '',
      ];
    }),
  ].join('\n');

  return { selected, params: toParams(selected.candidate), markdown };
}

/** Tableau des erreurs par échéance d'une variable continue, pour une ville. */
export function continuousTable(
  evaluations: readonly LeadEvaluation[],
  models: readonly Model[],
  unit: string,
): string {
  const shown = models.filter((model) =>
    evaluations.some((evaluation) => evaluation.models.includes(model.id)),
  );
  return markdownTable(
    [
      'Échéance',
      'Heures notées',
      ...shown.map((model) => model.name),
      'Moyenne simple',
      'Meilleur après coup',
      'Meilleur, fenêtre précédente',
      '**Mélange**',
      'Gain du mélange',
      'Biais du mélange',
    ],
    evaluations.map((evaluation) => [
      `J+${evaluation.lead}`,
      formatInteger(evaluation.count),
      ...shown.map((model) => formatNumber(evaluation.raw[model.id]?.mae ?? Number.NaN)),
      formatNumber(evaluation.simpleMean.mae),
      `${formatNumber(evaluation.bestAfterTheFact.score.mae)} (${models.find((model) => model.id === evaluation.bestAfterTheFact.model)?.name ?? '?'})`,
      formatNumber(evaluation.bestPrevious.mae),
      `**${formatNumber(evaluation.blend.mae)}**`,
      formatGain(gainOverBestPrevious(evaluation)),
      `${formatNumber(evaluation.blend.bias)} ${unit}`,
    ]),
  );
}

/** Meilleur modèle corrigé de son biais, connu après coup. */
function bestCorrected(evaluation: LeadEvaluation): {
  readonly model: string;
  readonly mae: number;
} {
  const [model, score] = Object.entries(evaluation.corrected).reduce((best, current) =>
    current[1].mae < best[1].mae ? current : best,
  );
  return { model, mae: score.mae };
}

function correctedTable(evaluations: readonly LeadEvaluation[], models: readonly Model[]): string {
  const shown = models.filter((model) =>
    evaluations.some((evaluation) => evaluation.models.includes(model.id)),
  );
  const nameOf = (id: string): string => models.find((model) => model.id === id)?.name ?? '?';
  return markdownTable(
    [
      'Échéance',
      ...shown.flatMap((model) => [`${model.name} brut`, `${model.name} corrigé`]),
      'Meilleur corrigé, après coup',
      '**Mélange**',
      'Gain du mélange sur le meilleur corrigé',
    ],
    evaluations.map((evaluation) => {
      const best = bestCorrected(evaluation);
      return [
        `J+${evaluation.lead}`,
        ...shown.flatMap((model) => [
          formatNumber(evaluation.raw[model.id]?.mae ?? Number.NaN),
          formatNumber(evaluation.corrected[model.id]?.mae ?? Number.NaN),
        ]),
        `${formatNumber(best.mae)} (${nameOf(best.model)})`,
        `**${formatNumber(evaluation.blend.mae)}**`,
        formatGain(1 - evaluation.blend.mae / best.mae),
      ];
    }),
  );
}

export type CityVerdict = { readonly city: string; readonly verdict: TemperatureVerdict };

export function temperatureSection(
  cities: Cities,
  params: BlendParams,
): { readonly markdown: string; readonly verdicts: CityVerdict[] } {
  const lines: string[] = [
    '## Température',
    '',
    `Erreur absolue moyenne, en °C, sur les mêmes heures pour toutes les méthodes. « Meilleur après coup » est le modèle brut le plus précis sur la période, connu seulement à la fin. « Meilleur, fenêtre précédente » est le modèle brut le plus précis sur les 30 jours précédant l'émission : c'est la référence du feu vert. Le gain est la baisse d'erreur du mélange face à cette référence.`,
    '',
  ];
  const verdicts: CityVerdict[] = [];
  for (const data of cities) {
    const validation = evaluateContinuous(data, 'temperature', MODELS, params, RANGES.validation);
    const year = evaluateContinuous(data, 'temperature', MODELS, params, RANGES.year);
    const verdict = judgeTemperature(validation);
    verdicts.push({ city: data.city.name, verdict });
    lines.push(
      `### ${data.city.name}`,
      '',
      `**Période de validation** (${formatRange(RANGES.validation)}), sur laquelle aucun paramètre n'a été réglé :`,
      '',
      continuousTable(validation, MODELS, '°C'),
      '',
      `Échéances où le gain atteint ${formatNumber(TEMPERATURE_MIN_GAIN * 100, 0)} % : **${verdict.leadsWithGain.length} sur ${verdict.leadsEvaluated.length}**${verdict.leadsWithGain.length > 0 ? ` (${verdict.leadsWithGain.map((lead) => `J+${lead}`).join(', ')})` : ''}.`,
      '',
      `**Année entière** (${formatRange(RANGES.year)}), pour information (elle contient la période de sélection) :`,
      '',
      continuousTable(year, MODELS, '°C'),
      '',
      'Ce que rapporte la correction de biais seule, modèle par modèle, et ce que le mélange ajoute au meilleur modèle corrigé (période de validation). Ce dernier n’est connu qu’après coup : la comparaison est sévère pour le mélange.',
      '',
      correctedTable(validation, MODELS),
      '',
    );
  }
  return { markdown: lines.join('\n'), verdicts };
}
