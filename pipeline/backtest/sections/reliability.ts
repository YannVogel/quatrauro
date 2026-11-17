// Section « indice de fiabilité » du rapport : formule, calibration, libellés.

import { BLEND_CONFIG } from '../../../shared/blendConfig.ts';
import { MODELS } from '../../../shared/models.ts';
import { leadsToEvaluate } from '../evaluate.ts';
import {
  CALIBRATION_MIN_COUNT,
  CALIBRATION_TOLERANCE,
  calibrationOf,
  daysOf,
  mean,
  quantile,
  runReliability,
  valuesOn,
  verifiedDays,
} from '../evaluateReliability.ts';
import type { ReliabilityRun } from '../evaluateReliability.ts';
import type { BlendParams } from '../params.ts';
import { reliabilityLabel } from '../../../shared/blend/reliability.ts';
import type { ReliabilityOptions } from '../../../shared/blend/reliability.ts';
import type { ReliabilityLabel } from '../../../shared/schemas.ts';
import { formatInteger, formatNumber, formatPercent, markdownTable } from '../markdown.ts';
import type { RainSettings } from '../simulateRain.ts';
import type { ReliabilitySettings } from '../simulateReliability.ts';
import { RANGES, formatRange } from './context.ts';
import type { Cities } from './context.ts';

const {
  temperatureTolerance: TEMPERATURE_TOLERANCE,
  labels: LABEL_THRESHOLDS,
  uncertainRain: UNCERTAIN_RAIN,
  priorStrength: PRIOR_STRENGTH,
  minSamples: MIN_SAMPLES,
  singleModelCap: SINGLE_MODEL_CAP,
} = BLEND_CONFIG.reliability;
const LABELS: Readonly<Record<ReliabilityLabel, string>> = {
  sure: 'Sûr',
  likely: 'Probable',
  uncertain: 'Incertain',
};

const round1 = (value: number): number => Math.round(value * 10) / 10;

function settingsFor(
  params: BlendParams,
  rain: RainSettings,
  spreadThresholds: readonly number[],
  temperatureTolerance: number = TEMPERATURE_TOLERANCE,
): ReliabilitySettings {
  const options: ReliabilityOptions = {
    spreadThresholds,
    uncertainRain: UNCERTAIN_RAIN,
    priorStrength: PRIOR_STRENGTH,
    minSamples: MIN_SAMPLES,
    singleModelCap: SINGLE_MODEL_CAP,
  };
  return {
    leadGrouping: params.leadGrouping,
    temperatureTolerance,
    rainThreshold: rain.threshold,
    rainAnnouncementProbability: rain.announcementProbability,
    options,
  };
}

/** Seuils de désaccord : les terciles de l'écart quotidien entre modèles sur la période de sélection, arrondis au dixième. */
function spreadThresholdsFromSelection(
  cities: Cities,
  params: BlendParams,
  rain: RainSettings,
): number[] {
  const spreads = cities.flatMap((data) => {
    const run = runReliability(data, MODELS, params, rain, settingsFor(params, rain, []));
    const days = daysOf(run, RANGES.selection);
    return [...run.byLead.values()].flatMap((series) => valuesOn(series.spread, days));
  });
  return [round1(quantile(spreads, 1 / 3)), round1(quantile(spreads, 2 / 3))];
}

function componentsTable(run: ReliabilityRun): string {
  const days = daysOf(run, RANGES.year);
  return markdownTable(
    [
      'Échéance',
      'Jours',
      `Maximum à ± ${TEMPERATURE_TOLERANCE} °C`,
      `Minimum à ± ${TEMPERATURE_TOLERANCE} °C`,
      'Pluie bien annoncée',
      '**Prévision tenue**',
      'Indice annoncé moyen',
    ],
    [...run.byLead].map(([lead, series]) => [
      `J+${lead}`,
      formatInteger(valuesOn(series.held, days).length),
      formatPercent(mean(valuesOn(series.components.maximum, days))),
      formatPercent(mean(valuesOn(series.components.minimum, days))),
      formatPercent(mean(valuesOn(series.components.rain, days))),
      `**${formatPercent(mean(valuesOn(series.held, days)))}**`,
      formatPercent(mean(verifiedDays(series, days).announced)),
    ]),
  );
}

const TOLERANCES_COMPARED = [1.5, 2, 2.5, 3] as const;

/** Part des prévisions tenues selon la tolérance de température : ce que coûte ou rapporte un critère plus ou moins strict. */
function toleranceTable(
  cities: Cities,
  params: BlendParams,
  rain: RainSettings,
  spreadThresholds: readonly number[],
): string {
  const rows = cities.flatMap((data) =>
    TOLERANCES_COMPARED.map((tolerance) => {
      const run = runReliability(
        data,
        MODELS,
        params,
        rain,
        settingsFor(params, rain, spreadThresholds, tolerance),
      );
      const days = daysOf(run, RANGES.year);
      return [
        data.city.name,
        `± ${formatNumber(tolerance, 1)} °C${tolerance === TEMPERATURE_TOLERANCE ? ' (retenue)' : ''}`,
        ...[...run.byLead.values()].map((series) =>
          formatPercent(mean(valuesOn(series.held, days))),
        ),
      ];
    }),
  );
  return markdownTable(
    ['Ville', 'Tolérance', ...leadsToEvaluate(MODELS).map((lead) => `J+${lead}`)],
    rows,
  );
}

function pooled(
  runs: readonly ReliabilityRun[],
  range: typeof RANGES.year,
): { announced: number[]; outcomes: boolean[] } {
  const announced: number[] = [];
  const outcomes: boolean[] = [];
  for (const run of runs) {
    const days = daysOf(run, range);
    for (const series of run.byLead.values()) {
      const verified = verifiedDays(series, days);
      announced.push(...verified.announced);
      outcomes.push(...verified.outcomes);
    }
  }
  return { announced, outcomes };
}

function calibrationTable(
  runs: readonly ReliabilityRun[],
  range: typeof RANGES.year,
): { readonly markdown: string; readonly calibrated: boolean } {
  const { announced, outcomes } = pooled(runs, range);
  const { bins, calibrated } = calibrationOf(announced, outcomes);
  const markdown = markdownTable(
    ['Indice annoncé', 'Jours', 'Indice moyen', 'Prévisions tenues', 'Écart'],
    bins.map((bin) => [
      `${formatPercent(bin.from)} à ${formatPercent(bin.to)}`,
      formatInteger(bin.count),
      formatPercent(bin.announced),
      formatPercent(bin.observed),
      Number.isFinite(bin.observed)
        ? `${formatNumber((bin.observed - bin.announced) * 100, 0)} pt`
        : '—',
    ]),
  );
  return { markdown, calibrated };
}

function labelTable(runs: readonly ReliabilityRun[]): string {
  const rows = runs.flatMap((run) => {
    const { announced, outcomes } = pooled([run], RANGES.year);
    return (Object.keys(LABELS) as ReliabilityLabel[]).map((label) => {
      const selected = announced
        .map((index, at) => ({ index, held: outcomes[at] ?? false }))
        .filter((entry) => reliabilityLabel(entry.index, LABEL_THRESHOLDS) === label);
      return [
        run.data.city.name,
        LABELS[label],
        formatInteger(selected.length),
        formatPercent(selected.length / announced.length),
        formatPercent(mean(selected.map((entry) => (entry.held ? 1 : 0)))),
      ];
    });
  });
  return markdownTable(['Ville', 'Libellé', 'Jours', 'Part des jours', 'Prévisions tenues'], rows);
}

export function reliabilitySection(
  cities: Cities,
  params: BlendParams,
  rain: RainSettings,
): {
  readonly markdown: string;
  readonly calibrated: boolean;
  readonly spreadThresholds: readonly number[];
  /** Les simulations et leurs réglages, pour le jeu de données de calibration. */
  readonly runs: readonly ReliabilityRun[];
  readonly settings: ReliabilitySettings;
} {
  const spreadThresholds = spreadThresholdsFromSelection(cities, params, rain);
  const settings = settingsFor(params, rain, spreadThresholds);
  const runs = cities.map((data) => runReliability(data, MODELS, params, rain, settings));
  const validation = calibrationTable(runs, RANGES.validation);
  const year = calibrationTable(runs, RANGES.year);

  const markdown = [
    '## Indice de fiabilité',
    '',
    `**Prévision tenue** : pour un jour (UTC), le maximum et le minimum de température sont à moins de ${TEMPERATURE_TOLERANCE} °C de l'observé, et l'annonce de pluie (oui ou non, au seuil de ${formatNumber(rain.threshold, 0)} mm) est juste.`,
    '',
    '**Formule** : l’indice d’un jour est la part des jours passés, dans une situation semblable, où la prévision a été tenue. Une situation est définie par la tranche d’échéance, le niveau de désaccord entre modèles (écart-type moyen sur la journée) et la netteté du signal de pluie. Le taux d’une situation peu rencontrée est tiré vers le taux de sa tranche. À signal de pluie égal, l’indice ne monte jamais quand le désaccord augmente.',
    '',
    markdownTable(
      ['Réglage', 'Valeur'],
      [
        [
          'Niveaux de désaccord (écart-type entre modèles)',
          `faible < ${formatNumber(spreadThresholds[0] ?? Number.NaN, 1)} °C ≤ moyen < ${formatNumber(spreadThresholds[1] ?? Number.NaN, 1)} °C ≤ fort (terciles de la période de sélection)`,
        ],
        [
          'Signal de pluie incertain',
          `probabilité entre ${formatPercent(UNCERTAIN_RAIN.from)} et ${formatPercent(UNCERTAIN_RAIN.to)}`,
        ],
        ['Poids du taux de la tranche', `${PRIOR_STRENGTH} jours fictifs`],
        [
          'Historique minimal',
          `${MIN_SAMPLES} jours vérifiés ; en dessous, l'indice est indisponible`,
        ],
        [
          'Libellés',
          `Sûr à partir de ${formatPercent(LABEL_THRESHOLDS.sure)}, Probable à partir de ${formatPercent(LABEL_THRESHOLDS.likely)}, Incertain en dessous`,
        ],
      ],
    ),
    '',
    `### Prévisions tenues, par échéance (${formatRange(RANGES.year)})`,
    '',
    ...runs.flatMap((run) => [`**${run.data.city.name}**`, '', componentsTable(run), '']),
    `### Effet de la tolérance (${formatRange(RANGES.year)})`,
    '',
    'Part des prévisions tenues selon la tolérance appliquée au minimum et au maximum de température.',
    '',
    toleranceTable(cities, params, rain, spreadThresholds),
    '',
    '### Calibration',
    '',
    `Quand l'indice annonce une valeur, les prévisions sont-elles tenues dans cette proportion ? Deux villes et toutes échéances confondues. Critère : dans chaque classe d'au moins ${CALIBRATION_MIN_COUNT} jours, l'écart ne dépasse pas ${formatNumber(CALIBRATION_TOLERANCE * 100, 0)} points.`,
    '',
    `**Période de validation** (${formatRange(RANGES.validation)}) — critère ${validation.calibrated ? 'rempli' : '**non rempli**'} :`,
    '',
    validation.markdown,
    '',
    `**Année entière** (${formatRange(RANGES.year)}) — critère ${year.calibrated ? 'rempli' : '**non rempli**'} :`,
    '',
    year.markdown,
    '',
    `### Libellés (${formatRange(RANGES.year)})`,
    '',
    labelTable(runs),
    '',
  ].join('\n');
  return { markdown, calibrated: validation.calibrated, spreadThresholds, runs, settings };
}
