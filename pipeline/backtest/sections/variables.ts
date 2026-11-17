// Sections « autres variables » et « modèle candidat » du rapport.

import { MODELS } from '../../../shared/models.ts';
import type { Model } from '../../../shared/models.ts';
import { CANDIDATE_MODEL, VARIABLES } from '../config.ts';
import type { VariableId } from '../config.ts';
import type { CityData } from '../data/dataset.ts';
import { buildInput, evaluateContinuous, leadsToEvaluate, positionsOf } from '../evaluate.ts';
import type { BlendParams } from '../params.ts';
import { formatGain, formatInteger, formatNumber, markdownTable } from '../markdown.ts';
import { commonPositions, scoreSeries } from '../score.ts';
import { simulateBlend } from '../simulate.ts';
import { RANGES, formatRange } from './context.ts';
import type { Cities } from './context.ts';
import { continuousTable } from './temperature.ts';

/** Part minimale d'heures remplies pour qu'une série soit exploitable sur la période. */
const MIN_FILL = 0.8;

const OTHER_VARIABLES: readonly VariableId[] = ['humidity', 'windSpeed', 'windGusts', 'cloudCover'];

function fillOf(series: Float64Array | undefined): number {
  if (series === undefined || series.length === 0) return 0;
  return series.filter((value) => Number.isFinite(value)).length / series.length;
}

/** Modèles dont l'historique de cette variable couvre la période (échéance J+1). */
export function modelsWithHistory(
  data: CityData,
  variable: VariableId,
  models: readonly Model[],
): Model[] {
  return models.filter((model) => fillOf(data.forecasts[variable][model.id]?.[0]) >= MIN_FILL);
}

export function otherVariablesSection(cities: Cities, params: BlendParams): string {
  const lines: string[] = [
    '## Autres variables',
    '',
    `Mêmes paramètres que pour la température, **sans réglage propre** à chaque variable. Période : année entière (${formatRange(RANGES.year)}). Seuls les modèles dont l'historique couvre la période sont mélangés.`,
    '',
  ];
  for (const variableId of OTHER_VARIABLES) {
    const variable = VARIABLES.find((entry) => entry.id === variableId);
    if (variable === undefined) throw new Error(`Variable inconnue : ${variableId}`);
    lines.push(`### ${variable.label} (${variable.unit})`, '');
    for (const data of cities) {
      if (fillOf(data.observations[variableId]) < MIN_FILL) {
        lines.push(
          `**${data.city.name}** : la station ne mesure pas cette variable, rien n'est vérifiable.`,
          '',
        );
        continue;
      }
      const models = modelsWithHistory(data, variableId, MODELS);
      const excluded = MODELS.filter((model) => !models.includes(model)).map((model) => model.name);
      const note =
        excluded.length === 0 ? '' : ` Sans ${excluded.join(', ')} (historique insuffisant).`;
      if (leadsToEvaluate(models).length === 0) {
        lines.push(`**${data.city.name}** : moins de deux modèles ont un historique.${note}`, '');
        continue;
      }
      lines.push(
        `**${data.city.name}**.${note}`,
        '',
        continuousTable(
          evaluateContinuous(data, variableId, models, params, RANGES.year),
          models,
          variable.unit,
        ),
        '',
      );
    }
  }
  return lines.join('\n');
}

/** Le mélange gagne-t-il à recevoir le modèle candidat ? Comparaison sur les mêmes heures. */
export function candidateSection(cities: Cities, params: BlendParams): string {
  const withCandidate = [...MODELS, CANDIDATE_MODEL];
  const lines: string[] = [
    `## Modèle candidat : ${CANDIDATE_MODEL.name}`,
    '',
    `Erreur absolue moyenne de température (°C) du mélange à cinq modèles et du mélange à six (avec ${CANDIDATE_MODEL.name}), sur les heures où les six modèles existent. Période : année entière (${formatRange(RANGES.year)}).`,
    '',
  ];
  for (const data of cities) {
    const base = buildInput(data, 'temperature', MODELS);
    const extended = buildInput(data, 'temperature', withCandidate);
    const baseSimulation = simulateBlend(base, params);
    const extendedSimulation = simulateBlend(extended, params);
    const { from, to } = positionsOf(data.axis, RANGES.year);
    const rows = leadsToEvaluate(withCandidate).flatMap((lead) => {
      const five = baseSimulation.get(lead)?.blend;
      const six = extendedSimulation.get(lead)?.blend;
      const candidate = extended.forecasts[withCandidate.length - 1]?.[lead - 1];
      if (five === undefined || six === undefined || candidate === undefined) return [];
      const raw = withCandidate
        .map((model, index) =>
          model.historyLeadDays >= lead ? extended.forecasts[index]?.[lead - 1] : undefined,
        )
        .filter((series): series is Float64Array => series !== undefined);
      const positions = commonPositions([...raw, five, six], base.observation, from, to);
      const scoreFive = scoreSeries(five, base.observation, positions);
      const scoreSix = scoreSeries(six, base.observation, positions);
      return [
        [
          `J+${lead}`,
          formatInteger(positions.length),
          formatNumber(scoreSeries(candidate, base.observation, positions).mae),
          formatNumber(scoreFive.mae, 3),
          formatNumber(scoreSix.mae, 3),
          formatGain(1 - scoreSix.mae / scoreFive.mae),
        ],
      ];
    });
    lines.push(
      `### ${data.city.name}`,
      '',
      markdownTable(
        [
          'Échéance',
          'Heures notées',
          `${CANDIDATE_MODEL.name} brut`,
          'Mélange à cinq',
          'Mélange à six',
          'Gain du sixième modèle',
        ],
        rows,
      ),
      '',
    );
  }
  return lines.join('\n');
}
