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
    /** Résumé de ce qui est affichable, sur l'écran provisoire. */
    upcoming: (hours: number, days: number) => `${hours} heures et ${days} jours à venir`,
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
  /** De quand date la prévision affichée. L'heure arrive déjà mise en forme (« 15 h 02 »). */
  freshness: {
    updatedToday: (time: string) => `Mis à jour à ${time}`,
    updatedYesterday: (time: string) => `Mis à jour hier à ${time}`,
    updatedOn: (day: string, time: string) => `Mis à jour ${day} à ${time}`,
    refreshing: 'Mise à jour en cours…',
    staleTitle: 'Prévision ancienne',
    staleDetail: (hours: string) =>
      `Elle a été calculée il y a ${hours} et n’a pas pu être mise à jour depuis.`,
    hours: (count: number) => (count === 1 ? '1 heure' : `${count} heures`),
    days: (count: number) => (count === 1 ? '1 jour' : `${count} jours`),
  },
  /** Ce que l'app dit quand elle n'a rien, ou pas mieux, à montrer. */
  states: {
    loading: 'Chargement de la prévision…',
    emptyTitle: 'Pas encore de prévision',
    retry: 'Tirez vers le bas pour réessayer.',
    /** Pourquoi il n'y a rien à afficher. */
    empty: {
      network:
        'L’app n’a pas pu joindre le serveur. Vérifiez votre connexion : la prévision apparaîtra dès qu’elle aura été reçue une première fois.',
      http: 'Les prévisions sont momentanément indisponibles.',
      invalid: 'Les prévisions reçues sont illisibles. Elles seront redemandées plus tard.',
      version:
        'Cette version de l’app ne sait pas lire les nouvelles prévisions. Mettez l’app à jour.',
      none: 'Aucune prévision n’a encore été reçue.',
      expired: 'La dernière prévision reçue ne décrit plus que des jours passés.',
    },
    /** Pourquoi la prévision affichée n'a pas pu être rafraîchie. */
    refreshFailed: {
      network: 'Pas de connexion : la prévision affichée n’a pas pu être mise à jour.',
      http: 'Le serveur n’a pas répondu : la prévision affichée n’a pas pu être mise à jour.',
      invalid: 'La nouvelle prévision était illisible : l’ancienne reste affichée.',
      version: 'Mettez l’app à jour pour recevoir les nouvelles prévisions.',
    },
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
