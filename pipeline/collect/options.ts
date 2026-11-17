import type { HttpOptions } from './http.ts';

/** Ce que la collecte reçoit du dehors : le réseau, l'horloge et le journal. */
export type CollectOptions = {
  readonly http: HttpOptions;
  readonly now: () => Date;
  /** Reçoit ce qui mérite d'être lu dans le journal du passage. */
  readonly log: (message: string) => void;
};
