// Ce que l'écran « À propos des données » affiche. Tout vient de la configuration : ajouter un
// modèle ou une ville ajoute sa ligne ici, sans toucher à l'écran.

import { formatDayInParis, formatTimeInParis } from '@/lib/dates';
import { CITIES } from '@shared/cities';
import type { City } from '@shared/cities';
import { MODELS } from '@shared/models';
import type { Model } from '@shared/models';

/** Un fournisseur et les modèles qu'il produit : « Météo-France : AROME, ARPEGE ». */
export type ModelSource = { readonly provider: string; readonly models: readonly string[] };

/** La station dont viennent les observations d'une ville. */
export type StationSource = {
  readonly city: string;
  readonly station: string;
  readonly stationId: string;
};

/** Les fournisseurs des modèles configurés, dans l'ordre de la configuration. */
export function modelSources(models: readonly Model[] = MODELS): ModelSource[] {
  const byProvider = new Map<string, string[]>();
  for (const model of models) {
    byProvider.set(model.provider, [...(byProvider.get(model.provider) ?? []), model.name]);
  }
  return [...byProvider].map(([provider, names]) => ({ provider, models: names }));
}

export function stationSources(cities: readonly City[] = CITIES): StationSource[] {
  return cities.map((city) => ({
    city: city.name,
    station: city.station.name,
    stationId: city.station.id,
  }));
}

/** « Toulon », « Toulon et Nice », « Toulon, Nice et Hyères ». */
export function listOf(names: readonly string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}`;
}

/** « mardi 17 novembre à 22 h 27 », à l'heure de Paris ; `null` tant qu'aucun calcul n'est connu. */
export function computedAt(generatedAt: string | null): string | null {
  if (generatedAt === null) return null;
  const instant = new Date(generatedAt);
  return `${formatDayInParis(instant)} à ${formatTimeInParis(instant)}`;
}
