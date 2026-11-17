// Lecture de l'API Previous Runs d'Open-Meteo : pour chaque heure, la valeur prévue N jours plus tôt.
// Documentation : https://open-meteo.com/en/docs/previous-runs-api (lue le 17/11/2026).

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { City, Model, Variable } from '../config.ts';
import { emptySeries, hourOfOpenMeteoTime } from './hours.ts';
import type { HourAxis } from './hours.ts';

const PREVIOUS_RUNS_URL = 'https://previous-runs-api.open-meteo.com/v1/forecast';
const PAUSE_BETWEEN_CALLS_MS = 1500;
const MAX_ATTEMPTS = 4;
const RETRY_BASE_MS = 20_000;

export type Period = { readonly start: string; readonly end: string };

function seriesName(variable: Variable, leadDays: number): string {
  return `${variable.openMeteoName}_previous_day${leadDays}`;
}

export function buildPreviousRunsUrl(city: City, model: Model, variable: Variable, period: Period): string {
  const leads = Array.from({ length: model.historyLeadDays }, (_, index) => index + 1);
  const query = new URLSearchParams({
    latitude: String(city.latitude),
    longitude: String(city.longitude),
    hourly: leads.map((lead) => seriesName(variable, lead)).join(','),
    models: model.openMeteoId,
    start_date: period.start,
    end_date: period.end,
    timezone: 'GMT',
  });
  return `${PREVIOUS_RUNS_URL}?${query.toString()}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Convertit une réponse Previous Runs en séries alignées sur l'axe, une par échéance
 * (indice 0 = J−1). Refuse toute réponse qui n'a pas la forme attendue.
 */
export function parsePreviousRuns(response: unknown, model: Model, variable: Variable, axis: HourAxis): Float64Array[] {
  if (!isRecord(response) || !isRecord(response.hourly)) {
    throw new Error(`Réponse Open-Meteo sans bloc « hourly » (${model.id}, ${variable.id})`);
  }
  const { hourly } = response;
  const times = hourly.time;
  if (!Array.isArray(times)) {
    throw new Error(`Réponse Open-Meteo sans « hourly.time » (${model.id}, ${variable.id})`);
  }
  const positions = times.map((time) => {
    if (typeof time !== 'string') throw new Error(`Heure Open-Meteo inattendue : ${String(time)}`);
    return hourOfOpenMeteoTime(time) - axis.startHour;
  });

  return Array.from({ length: model.historyLeadDays }, (_, index) => {
    // Avec un seul modèle demandé, l'API ne suffixe pas les séries par son identifiant.
    const name = seriesName(variable, index + 1);
    const values = hourly[name] ?? hourly[`${name}_${model.openMeteoId}`];
    if (!Array.isArray(values) || values.length !== times.length) {
      throw new Error(`Série « ${name} » absente ou de longueur inattendue (${model.id})`);
    }
    const series = emptySeries(axis);
    values.forEach((value, at) => {
      const position = positions[at];
      if (position === undefined || position < 0 || position >= axis.length) return;
      if (value === null) return;
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new Error(`Valeur inattendue dans « ${name} » : ${String(value)}`);
      }
      series[position] = value;
    });
    return series;
  });
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJson(url: string): Promise<unknown> {
  for (let attempt = 1; ; attempt += 1) {
    const response = await fetch(url);
    if (response.ok) return response.json();
    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt === MAX_ATTEMPTS) {
      throw new Error(`Open-Meteo a répondu ${response.status} : ${await response.text()}`);
    }
    await sleep(RETRY_BASE_MS * attempt);
  }
}

/**
 * Séries de prévision d'un modèle pour une ville et une variable, par échéance.
 * La réponse brute est gardée sur disque : un second passage ne refait aucun appel.
 */
export async function loadForecasts(
  cacheDir: string,
  city: City,
  model: Model,
  variable: Variable,
  period: Period,
  axis: HourAxis,
): Promise<Float64Array[]> {
  const file = path.join(cacheDir, 'open-meteo', `${city.id}_${model.id}_${variable.id}_${period.start}_${period.end}.json`);
  let raw: string;
  try {
    raw = await readFile(file, 'utf8');
  } catch (error) {
    if (!isRecord(error) || error.code !== 'ENOENT') throw error;
    const response = await fetchJson(buildPreviousRunsUrl(city, model, variable, period));
    raw = JSON.stringify(response);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, raw);
    await sleep(PAUSE_BETWEEN_CALLS_MS);
  }
  return parsePreviousRuns(JSON.parse(raw), model, variable, axis);
}
