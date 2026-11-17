import type { LeadGrouping } from '../../../shared/blend/grouping.ts';

/** Paramètres du mélange d'une variable continue. Leurs valeurs sont fixées par le backtest (ADR 0003). */
export type BlendParams = {
  /** Vitesse d'oubli du biais : demi-vie, en jours, du poids d'une erreur passée. */
  readonly biasHalfLifeDays: number;
  /** Fenêtre de l'erreur récente qui fixe les poids : demi-vie, en jours. */
  readonly errorHalfLifeDays: number;
  readonly weightExponent: number;
  /** Nombre de blocs horaires par jour dans lesquels biais et erreur sont suivis séparément. */
  readonly hourBlocksPerDay: number;
  readonly leadGrouping: LeadGrouping;
  /** En dessous de ce nombre de paires, un modèle n'est ni corrigé ni noté. */
  readonly minSamples: number;
  readonly errorFloor: number;
  /** Garde-fous : poids minimal et maximal d'un modèle. */
  readonly minWeight: number;
  readonly maxWeight: number;
};
