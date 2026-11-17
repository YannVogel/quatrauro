// Backtest du mélange (spike M0-03) : télécharge les données si besoin, choisit les paramètres
// sur la période de sélection, juge sur la période de validation et écrit les tableaux du rapport.
// Usage : node pipeline/backtest/run.ts

import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { CANDIDATE_MODEL, CITIES, MODELS, PERIOD, VARIABLES } from './config.ts';
import { loadCityData } from './data/dataset.ts';
import { formatNumber } from './markdown.ts';
import { RANGES, formatRange } from './sections/context.ts';
import { dataSection } from './sections/data.ts';
import { rainSection, selectRainSettings } from './sections/rain.ts';
import { reliabilitySection } from './sections/reliability.ts';
import { selectTemperatureParams, temperatureSection } from './sections/temperature.ts';
import { candidateSection, otherVariablesSection } from './sections/variables.ts';
import { TEMPERATURE_MIN_GAIN } from './verdict.ts';

const cacheDir = path.join(import.meta.dirname, '.cache');
const reportFile = path.join(
  import.meta.dirname,
  '..',
  '..',
  'docs',
  'features',
  'backtest-resultats.md',
);
const log = (message: string): void => console.log(message);

const cities = [];
for (const city of CITIES) {
  cities.push(
    await loadCityData(
      cacheDir,
      city,
      [...MODELS, CANDIDATE_MODEL],
      VARIABLES,
      PERIOD,
      () => undefined,
    ),
  );
  log(`Données lues : ${city.name}`);
}

const selection = selectTemperatureParams(cities);
log(`Paramètres retenus : ${JSON.stringify(selection.selected.candidate)}`);
const temperature = temperatureSection(cities, selection.params);
const rainSelection = selectRainSettings(cities, selection.params.leadGrouping);
const rain = rainSection(cities, rainSelection.settings);
const reliability = reliabilitySection(cities, selection.params, rainSelection.settings.daily);

const temperaturePassed = temperature.verdicts.every((entry) => entry.verdict.passed);
const rainDegraded = rain.verdicts.some((entry) => entry.degraded);
const greenLight = temperaturePassed && !rainDegraded;

const verdict = [
  '## Verdict',
  '',
  `Critère de l'issue M0-03 : le mélange réduit l'erreur absolue moyenne de température d'au moins ${formatNumber(TEMPERATURE_MIN_GAIN * 100, 0)} % face au meilleur modèle seul « sur la fenêtre précédente », sur la majorité des tranches d'échéance, sans dégrader la pluie. Il est appliqué à la période de validation (${formatRange(RANGES.validation)}), dans chaque ville.`,
  '',
  ...temperature.verdicts.map(
    (entry) =>
      `- **Température, ${entry.city}** : gain d'au moins ${formatNumber(TEMPERATURE_MIN_GAIN * 100, 0)} % sur ${entry.verdict.leadsWithGain.length} échéances sur ${entry.verdict.leadsEvaluated.length} → critère ${entry.verdict.passed ? 'rempli' : '**non rempli**'}.`,
  ),
  ...rain.verdicts.map(
    (entry) => `- **Pluie, ${entry.city}** : ${entry.degraded ? '**dégradée**' : 'non dégradée'}.`,
  ),
  '',
  greenLight
    ? '**Feu vert : le critère est atteint dans les deux villes.**'
    : '**Le critère n’est pas atteint partout : pas de feu vert en l’état.**',
  '',
].join('\n');

const header = [
  '# Backtest du mélange : tableaux de résultats',
  '',
  '> Fichier **généré** par `node pipeline/backtest/run.ts`. Ne pas le modifier à la main : relancer le script. La méthode, la lecture des résultats et leurs limites sont dans [backtest.md](backtest.md).',
  '',
].join('\n');

const report = [
  header,
  verdict,
  dataSection(cities),
  selection.markdown,
  temperature.markdown,
  candidateSection(cities, selection.params),
  otherVariablesSection(cities, selection.params),
  rainSelection.markdown,
  rain.markdown,
  reliability.markdown,
].join('\n');

await writeFile(reportFile, report.replace(/\n{3,}/g, '\n\n'));
log(verdict);
log(`Rapport écrit : ${path.relative(process.cwd(), reportFile)}`);
