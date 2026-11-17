// Toutes les chaînes affichées par l'app. Aucune chaîne en dur dans les composants.

import type { Condition } from '@shared/conditions';

export const fr = {
  app: {
    name: 'Quatrauro',
    tagline: 'Quatre vents, une seule prévision.',
  },
  home: {
    placeholder: 'Les prévisions de Toulon et de Nice arrivent bientôt.',
    openCatalog: 'Ouvrir le catalogue des composants',
  },
  /** Écran de développement : il n'existe pas dans l'app distribuée. */
  catalog: {
    title: 'Catalogue',
    subtitle: 'Données fictives',
    back: 'Retour',
    toggleTheme: 'Basculer entre thème clair et sombre',
    city: 'Ville',
    day: 'de jour',
    night: 'de nuit',
    sections: {
      controls: 'Sélecteur et boutons',
      conditions: 'Conditions et blocs d’état',
      hours: 'Vignettes horaires',
      week: 'Lignes de jour',
      chart: 'Graphique horaire',
      stats: 'Vignettes',
      models: 'Modèles',
      meters: 'Barres de proportion',
      typography: 'Typographie',
    },
    notes: {
      missing: 'Valeurs absentes',
      fewColumns: 'Trois colonnes',
    },
    stats: { wind: 'Vent', rain: 'Cumul', humidity: 'Humidité', feelsLike: 'Ressenti' },
    reliability: (percent: string) => `Fiabilité ${percent}`,
  },
  common: {
    /** Signe affiché à la place d'une valeur absente. */
    missing: '—',
    /** Ce que lit un lecteur d'écran à la place d'une valeur absente. */
    unavailable: 'indisponible',
  },
  /** Ce que disent les composants aux lecteurs d'écran. Les nombres arrivent déjà mis en forme. */
  spoken: {
    degrees: (value: string) => `${value} ${value === '0' || value === '1' ? 'degré' : 'degrés'}`,
    temperatureRange: (min: string, max: string) => `de ${min} à ${max} degrés`,
    hour: (hour: string) => `${hour} heures`,
    rainRisk: (percent: string) => `risque de pluie ${percent}`,
    reliability: (percent: string) => `fiabilité ${percent}`,
    weight: (percent: string) => `poids ${percent}`,
    proportion: (percent: string) => percent,
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
