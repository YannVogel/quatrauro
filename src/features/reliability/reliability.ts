// Ce que montre l'écran « Fiabilité » : le bilan du mélange face aux mesures. Fonctions pures :
// les chiffres sont ceux du fichier de vérification, mis en forme mais jamais recalculés.

import { shortDayOf, spokenDayOf } from '@/features/forecast';
import { LARGE_GAP_DEGREES, MIN_VERIFIED_HOURS } from '@/lib/config';
import { MODELS } from '@shared/models';
import { startOfParisDay } from '@shared/parisTime';
import type { VerificationFile } from '@shared/schemas';

const DAY_MS = 86_400_000;
const PERCENT = 100;
/** Échéance des prévisions « faites la veille ». */
const DAY_AHEAD = 1;

/** Le mélange face au meilleur modèle seul, sans arrondir en sa faveur. */
export type Verdict = 'better' | 'equal' | 'worse';

export type ComparedDay = {
  readonly date: string;
  /** « Lun. 16 ». */
  readonly label: string;
  /** « lundi 16 ». */
  readonly spokenLabel: string;
  /** Température maximale prévue la veille, et mesurée. */
  readonly forecast: number | null;
  readonly observed: number | null;
  /** Écart absolu entre les deux ; `null` s'il manque l'un ou l'autre. */
  readonly gap: number | null;
  /** L'écart atteint la tolérance d'une prévision tenue. */
  readonly isLarge: boolean;
};

export type LeadError = {
  readonly lead: number;
  readonly error: number;
  /** Part de la plus grande erreur affichée, de 0 à 1 : la longueur de sa barre. */
  readonly ratio: number;
};

export type ReliabilityContent =
  /** Trop peu de prévisions vérifiées pour afficher un score. */
  | { readonly status: 'insufficient'; readonly verifiedHours: number }
  | {
      readonly status: 'ready';
      /** Période des scores, bornes comprises. */
      readonly period: { readonly from: string; readonly to: string };
      readonly periodDays: number;
      /** Erreur absolue moyenne du mélange pour les prévisions faites la veille. */
      readonly blendError: number;
      readonly best: { readonly name: string; readonly error: number } | null;
      readonly verdict: Verdict | null;
      /** Jours de pluie ou de temps sec bien annoncés ; `null` sans jour comparé. */
      readonly rain: { readonly correct: number; readonly count: number } | null;
      /** Du plus récent au plus ancien. */
      readonly days: readonly ComparedDay[];
      readonly leads: readonly LeadError[];
    };

const daysBetween = (from: string, to: string): number =>
  Math.round((startOfParisDay(to).getTime() - startOfParisDay(from).getTime()) / DAY_MS) + 1;

const dayNumber = (date: string): string => String(Number(date.slice(8, 10)));

function comparedDay(day: VerificationFile['temperature']['recentDays'][number]): ComparedDay {
  const forecast = day.forecastMax;
  const observed = day.observedMax;
  const gap = forecast === null || observed === null ? null : Math.abs(forecast - observed);
  return {
    date: day.date,
    label: `${shortDayOf(day.date)} ${dayNumber(day.date)}`,
    spokenLabel: `${spokenDayOf(day.date)} ${dayNumber(day.date)}`,
    forecast,
    observed,
    gap,
    isLarge: gap !== null && gap >= LARGE_GAP_DEGREES,
  };
}

function verdictOf(blend: number, best: number): Verdict {
  if (blend < best) return 'better';
  return blend > best ? 'worse' : 'equal';
}

export function reliabilityContent(verification: VerificationFile): ReliabilityContent {
  const { period, temperature, rain } = verification;
  const dayAhead = temperature.byLead.find((score) => score.leadDays === DAY_AHEAD);
  const verifiedHours = dayAhead?.count ?? 0;
  if (
    period === null ||
    dayAhead === undefined ||
    dayAhead.blend === null ||
    verifiedHours < MIN_VERIFIED_HOURS
  ) {
    return { status: 'insufficient', verifiedHours };
  }

  const bestModel = dayAhead.bestModel;
  const leads = temperature.byLead.flatMap((score) =>
    score.blend === null ? [] : [{ lead: score.leadDays, error: score.blend }],
  );
  const largest = Math.max(...leads.map((lead) => lead.error));
  return {
    status: 'ready',
    period,
    periodDays: daysBetween(period.from, period.to),
    blendError: dayAhead.blend,
    best:
      bestModel === null
        ? null
        : {
            name: MODELS.find((model) => model.id === bestModel.id)?.name ?? bestModel.id,
            error: bestModel.error,
          },
    verdict: bestModel === null ? null : verdictOf(dayAhead.blend, bestModel.error),
    rain:
      rain.hitRate === null || rain.count === 0
        ? null
        : { correct: Math.round((rain.hitRate * rain.count) / PERCENT), count: rain.count },
    days: [...temperature.recentDays].reverse().map(comparedDay),
    leads: leads.map((lead) => ({ ...lead, ratio: largest > 0 ? lead.error / largest : 0 })),
  };
}
