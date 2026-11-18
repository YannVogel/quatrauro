// Toutes les chaînes affichées par l'app. Aucune chaîne en dur dans les composants.

import type { Condition } from '@shared/conditions';

export const fr = {
  app: {
    name: 'Quatrauro',
    tagline: 'Quatre vents, une seule prévision.',
  },
  home: {
    /** Ce que choisit le sélecteur du bloc d'état, pour les lecteurs d'écran. */
    city: 'Ville',
    /** « Mardi 17 novembre · vent 18 km/h ». */
    dateAndWind: (day: string, wind: string) => `${day} · vent ${wind}`,
    reliability: (percent: string) => `Fiabilité ${percent}`,
    agreement: (agreeing: number, total: number) => {
      if (agreeing === total) return total === 1 ? '1 modèle' : `${total} modèles d’accord`;
      return `${agreeing} modèles sur ${total} d’accord`;
    },
    openModels: 'Voir ce que prévoit chaque modèle',
    conditionUnavailable: 'Condition indisponible',
    nextHours: 'Prochaines heures',
    week: 'Les sept prochains jours',
    openDay: (day: string) => `Ouvrir le détail de ${day}`,
    links: {
      reliability: 'Fiabilité des prévisions',
      about: 'À propos des données',
      catalog: 'Catalogue des composants',
    },
  },
  /** Réglage du thème. */
  theme: {
    open: 'Choisir le thème',
    title: 'Thème',
    close: 'Fermer',
    options: {
      system: 'Système',
      light: 'Clair',
      dark: 'Sombre',
    },
    systemHint: 'Suit le réglage du téléphone',
  },
  /** Détail d'un jour. */
  day: {
    back: 'Retour à l’accueil',
    maximum: 'maximum',
    minimum: 'minimum',
    reliability: (percent: string) => `Fiabilité ${percent}`,
    coverage: (models: number) =>
      models === 1 ? '1 modèle couvre ce jour' : `${models} modèles couvrent ce jour`,
    hourly: 'Heure par heure',
    hourlyLegend: 'barre = risque de pluie',
    /** Libellés courts : la vignette n'a pas la place d'en dire plus. Vent et ressenti sont les plus forts du jour. */
    stats: { wind: 'Vent max', rain: 'Cumul', humidity: 'Humidité', feelsLike: 'Ressenti' },
    rainStart: 'Début de la pluie selon les modèles',
    noRain: 'pas de pluie',
    spokenRainStart: (model: string, hour: string) => `${model}, pluie dès ${hour}`,
    spokenNoRain: (model: string) => `${model}, pas de pluie`,
    maxTemperature: 'Température maximale selon les modèles',
    spokenMaxTemperature: (model: string, degrees: string) => `${model}, ${degrees}`,
    /** Le jour demandé n'est pas, ou plus, dans la prévision. */
    goneTitle: 'Ce jour n’est plus dans la prévision',
    gone: 'Il est passé, ou trop lointain. Revenez à l’accueil pour voir les jours à venir.',
  },
  /** Écran « Les modèles ». */
  models: {
    title: 'Les modèles',
    back: 'Retour',
    daySelector: 'Jour',
    today: 'Aujourd’hui',
    tomorrow: 'Demain',
    shortToday: 'Auj.',
    shortTomorrow: 'Dem.',
    /** « Demain, 15 h ». */
    moment: (day: string, hour: string) => `${day}, ${hour}`,
    combined: 'prévision combinée',
    spread: (degrees: string) => `Écart ${degrees}`,
    spreadDetail: 'entre le plus chaud et le plus frais',
    listTitle: 'Ce que prévoit chaque modèle',
    listCaption: 'Poids moyen sur la journée',
    /** Pourquoi un modèle n'a pas de valeur, à la suite de son fournisseur. */
    outOfRange: 'ne va pas jusque-là',
    absent: 'absent du dernier calcul',
    errorsTitle: 'Erreur moyenne récente',
    /** L'échéance en heures : « demain » est à plus de 24 heures, donc entre 24 et 48 h. */
    errorsPeriod: (lead: number, days: number) =>
      `prévisions faites ${(lead - 1) * 24} à ${lead * 24}\u00a0h avant, sur ${days} jours`,
    errorsBlend: 'Prévision combinée',
    errorsNone: 'Pas encore assez de jours vérifiés pour noter les modèles.',
    explanation: (city: string) =>
      `Plus un modèle s’est trompé récemment à ${city}, moins il pèse. Les poids sont recalculés à chaque mise à jour, à partir des mesures de la station.`,
  },
  /** Écran « Fiabilité ». */
  reliability: {
    title: 'Fiabilité',
    back: 'Retour',
    heroCaption: (days: number) =>
      `Erreur moyenne des prévisions faites la veille, sur ${days} jours`,
    /** Le mélange face au meilleur modèle seul : dit tel quel, dans les trois cas. */
    better: (error: string, model: string) =>
      `contre ${error} pour le meilleur modèle seul (${model})`,
    equal: (error: string, model: string) =>
      `à égalité avec le meilleur modèle seul (${model}, ${error})`,
    worse: (error: string, model: string) =>
      `Sur cette période, la prévision combinée fait moins bien que ${model} seul (${error}).`,
    noBest: 'Aucun modèle seul n’a pu être noté sur cette période.',
    rain: (correct: number, count: number) => `Pluie : ${correct} jours sur ${count}`,
    rainDetail: 'bien annoncés',
    daysTitle: '7 derniers jours',
    daysCaption: 'Température maximale prévue la veille',
    forecast: 'Prévu',
    observed: 'Observé',
    gap: 'Écart',
    spokenDay: (day: string, forecast: string, observed: string, gap: string) =>
      `${day}, prévu ${forecast}, observé ${observed}, écart ${gap}`,
    largeGap: 'écart important',
    leadsTitle: 'Erreur selon l’échéance',
    leadsCaption: 'température',
    lead: (days: number) => (days === 1 ? '1 jour avant' : `${days} jours avant`),
    spokenLead: (lead: string, error: string) =>
      `prévisions faites ${lead}, erreur moyenne ${error}`,
    insufficientTitle: 'Pas encore assez de recul',
    insufficient: (hours: number) =>
      hours === 0
        ? 'Aucune prévision n’a encore pu être comparée à ce qui a été mesuré. Les premiers scores apparaîtront après une semaine.'
        : `Seulement ${hours} heures de prévisions ont été comparées aux mesures. Les scores apparaîtront après une semaine : avant, une moyenne ne voudrait rien dire.`,
    loading: 'Chargement des scores…',
    unavailable: 'Les scores n’ont pas pu être chargés.',
    period: (from: string, to: string) => `Scores du ${from} au ${to}`,
  },
  /** Écrans qui ne sont pas encore écrits : ils disent qu'ils arrivent, et ramènent à l'accueil. */
  pending: {
    back: 'Retour',
    body: 'Cet écran arrive bientôt.',
    about: 'À propos des données',
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
      themeMenu: 'Menu du thème (il ne change pas le thème de l’app)',
      manyCities: 'Quatre villes : la rangée défile',
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
    hour: (hour: string) => `${hour} ${hour === '0' || hour === '1' ? 'heure' : 'heures'}`,
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
