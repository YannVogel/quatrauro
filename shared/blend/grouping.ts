// Regroupements qui indexent le biais et l'erreur d'un modèle : tranche d'échéance et
// moment de la journée.

const HOURS_PER_DAY = 24;

/** Tranches d'échéance, en jours : `[[1], [2], [3], [4, 5], [6, 7]]` regroupe J+4 avec J+5. */
export type LeadGrouping = readonly (readonly number[])[];

/** Bloc horaire d'une heure UTC, pour `blocksPerDay` blocs égaux (1 = pas de distinction). */
export function hourBlockOf(utcHour: number, blocksPerDay: number): number {
  if (!Number.isInteger(blocksPerDay) || HOURS_PER_DAY % blocksPerDay !== 0) {
    throw new Error(`Nombre de blocs horaires invalide : ${blocksPerDay}`);
  }
  return Math.floor(utcHour / (HOURS_PER_DAY / blocksPerDay));
}
