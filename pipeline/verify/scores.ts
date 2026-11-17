// Scores publiés dans `verification/<ville>.json`. Ils se calculent entièrement à partir de
// l'archive (cases, observations, registre des jours) : les recalculer redonne les mêmes.

import { MAX_LEAD_DAYS } from '../../shared/blendConfig.ts';
import type { CityId } from '../../shared/cities.ts';
import { MODEL_IDS } from '../../shared/models.ts';
import type { ModelId } from '../../shared/models.ts';
import { parisDateKey } from '../../shared/parisTime.ts';
import { SCHEMA_VERSION } from '../../shared/schemas.ts';
import type { VerificationFile } from '../../shared/schemas.ts';
import type { CellIndex } from '../archive/forecasts.ts';
import type { ObservationIndex } from '../archive/observations.ts';
import { RECENT_DAYS_COUNT, VERIFICATION_WINDOW_DAYS, roundTo } from '../config.ts';
import { DAY_MS, HOUR_MS } from '../instant.ts';
import type { DayRecord } from './learn.ts';

/** Un modèle n'est candidat au titre de « meilleur modèle » que s'il couvre au moins cette part des heures comparées. */
const MIN_SHARE_FOR_BEST_MODEL = 0.5;
const ERROR_DECIMALS = 2;
const TEMPERATURE_DECIMALS = 1;

type Sum = { total: number; count: number };
const add = (sum: Sum, value: number): void => {
  sum.total += value;
  sum.count += 1;
};
const meanOf = (sum: Sum): number => roundTo(sum.total / sum.count, ERROR_DECIMALS);
const oneDecimal = (value: number | null): number | null =>
  value === null ? null : roundTo(value, TEMPERATURE_DECIMALS);

/** Première heure de la période des scores, pour une vérification arrêtée à `through`. */
export const scoresWindowStart = (through: number): number =>
  through - VERIFICATION_WINDOW_DAYS * DAY_MS + HOUR_MS;

type LeadScore = VerificationFile['temperature']['byLead'][number];

function leadScore(
  lead: number,
  cells: CellIndex,
  observations: ObservationIndex,
  from: number,
  through: number,
): LeadScore | null {
  const blend: Sum = { total: 0, count: 0 };
  const models = new Map<ModelId, Sum>();
  for (let time = from; time <= through; time += HOUR_MS) {
    const observed = observations.get(time)?.temperature ?? null;
    const cell = cells.at(time, lead);
    const blended = cell?.blend.temperature ?? null;
    if (observed === null || cell === undefined || blended === null) continue;
    add(blend, Math.abs(blended - observed));
    for (const modelId of MODEL_IDS) {
      const raw = cell.models[modelId]?.raw.temperature ?? null;
      if (raw === null) continue;
      const sum = models.get(modelId) ?? { total: 0, count: 0 };
      add(sum, Math.abs(raw - observed));
      models.set(modelId, sum);
    }
  }
  if (blend.count === 0) return null;

  const candidates = [...models]
    .filter(([, sum]) => sum.count >= blend.count * MIN_SHARE_FOR_BEST_MODEL)
    .map(([id, sum]) => ({ id, error: meanOf(sum) }))
    .sort((a, b) => a.error - b.error);
  return {
    leadDays: lead,
    count: blend.count,
    blend: meanOf(blend),
    bestModel: candidates[0] ?? null,
    models: Object.fromEntries([...models].map(([id, sum]) => [id, meanOf(sum)])),
  };
}

export function buildVerification(input: {
  readonly cityId: CityId;
  readonly generatedAt: string;
  /** Dernière heure apprise, en millisecondes ; `null` tant que rien n'a été vérifié. */
  readonly through: number | null;
  readonly cells: CellIndex;
  readonly observations: ObservationIndex;
  /** Jours jugés de la période, toutes échéances confondues. */
  readonly days: readonly DayRecord[];
}): VerificationFile {
  const { cityId, generatedAt, through, cells, observations } = input;
  const empty: VerificationFile = {
    schemaVersion: SCHEMA_VERSION,
    city: cityId,
    generatedAt,
    period: null,
    temperature: { byLead: [], recentDays: [] },
    rain: { count: 0, hitRate: null },
  };
  if (through === null) return empty;

  const from = scoresWindowStart(through);
  const firstDay = parisDateKey(new Date(from));
  const lastDay = parisDateKey(new Date(through));
  const byLead = Array.from({ length: MAX_LEAD_DAYS }, (_, index) =>
    leadScore(index + 1, cells, observations, from, through),
  ).filter((score): score is LeadScore => score !== null);

  // « Prévu la veille » : l'échéance d'un jour.
  const dayBefore = input.days.filter(
    (record) => record.lead === 1 && record.date >= firstDay && record.date <= lastDay,
  );
  const compared = dayBefore.filter(
    (record) => record.observedMin !== null || record.observedMax !== null,
  );
  const rainDays = dayBefore.filter((record) => record.rainHeld !== null);
  if (byLead.length === 0 && compared.length === 0 && rainDays.length === 0) return empty;

  return {
    ...empty,
    period: { from: firstDay, to: lastDay },
    temperature: {
      byLead,
      recentDays: compared.slice(-RECENT_DAYS_COUNT).map((record) => ({
        date: record.date,
        forecastMin: oneDecimal(record.forecastMin),
        forecastMax: oneDecimal(record.forecastMax),
        observedMin: oneDecimal(record.observedMin),
        observedMax: oneDecimal(record.observedMax),
      })),
    },
    rain: {
      count: rainDays.length,
      hitRate:
        rainDays.length === 0
          ? null
          : roundTo(
              (100 * rainDays.filter((record) => record.rainHeld === true).length) /
                rainDays.length,
              1,
            ),
    },
  };
}
