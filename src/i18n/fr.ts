// Toutes les chaînes affichées par l'app. Aucune chaîne en dur dans les composants.

import type { Condition } from '@shared/conditions';

export const fr = {
  app: {
    name: 'Quatrauro',
    tagline: 'Quatre vents, une seule prévision.',
  },
  home: {
    placeholder: 'Les prévisions de Toulon et de Nice arrivent bientôt.',
  },
  /** Nom de chaque condition, lu par les lecteurs d'écran à la place de son icône. */
  conditions: {
    clear: 'Ciel dégagé',
    partlyCloudy: 'Éclaircies',
    cloudy: 'Couvert',
    rain: 'Pluie',
    showers: 'Averses',
    thunderstorm: 'Orage',
    snow: 'Neige',
    windy: 'Vent fort',
  } satisfies Record<Condition, string>,
} as const;
