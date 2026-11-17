// Section « données » du rapport : ce sur quoi le backtest a tourné.

import { CANDIDATE_MODEL, MODELS, OBSERVATION_DELAY_HOURS, PERIOD, VARIABLES } from '../config.ts';
import { formatPercent, markdownTable } from '../markdown.ts';
import { RANGES, formatDate, formatRange } from './context.ts';
import type { Cities } from './context.ts';

function fill(series: Float64Array | undefined): string {
  if (series === undefined || series.length === 0) return '—';
  return formatPercent(series.filter((value) => Number.isFinite(value)).length / series.length);
}

export function dataSection(cities: Cities): string {
  const models = [...MODELS, CANDIDATE_MODEL];
  const lines: string[] = [
    '## Données',
    '',
    `- **Période téléchargée** : ${formatRange({ from: PERIOD.start, to: PERIOD.end })}. Les 46 premiers jours servent d'apprentissage et ne sont pas notés.`,
    `- **Période de sélection** (réglage des paramètres) : ${formatRange(RANGES.selection)}.`,
    `- **Période de validation** (jugement) : ${formatRange(RANGES.validation)}.`,
    `- **Prévisions** : API Previous Runs d'Open-Meteo, décalages de 1 à 7 jours (« J+N » = prévision faite N × 24 h avant l'heure visée).`,
    `- **Observations** : fichiers horaires de Météo-France, stations ${cities.map((data) => `${data.city.station} (${data.city.name})`).join(' et ')}.`,
    `- **Délai de publication des observations** retenu : ${OBSERVATION_DELAY_HOURS} h. Une prévision n'apprend que des observations publiées au moment où elle est émise.`,
    `- **Jours** : tous les agrégats quotidiens (minimum, maximum, cumul de pluie) portent sur des jours UTC.`,
    '',
    `Part des heures remplies entre le ${formatDate(PERIOD.start)} et le ${formatDate(PERIOD.end)}, à l'échéance J+1 pour les modèles (les mêmes pour les deux villes : les trous sont ceux de l'archive d'Open-Meteo).`,
    '',
  ];
  for (const data of cities) {
    lines.push(
      `### ${data.city.name}`,
      '',
      markdownTable(
        ['Variable', 'Observation', ...models.map((model) => model.name)],
        VARIABLES.map((variable) => [
          variable.label,
          fill(data.observations[variable.id]),
          ...models.map((model) => fill(data.forecasts[variable.id][model.id]?.[0])),
        ]),
      ),
      '',
    );
  }
  return lines.join('\n');
}
