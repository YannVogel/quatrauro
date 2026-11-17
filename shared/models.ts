// Les modèles de prévision mélangés par Quatrauro : la seule liste. Tous sont lus via
// Open-Meteo. Portées et fréquences viennent de l'ADR 0002 (docs/features/donnees.md).

export type Model = {
  readonly id: string;
  /** Nom affiché : « AROME ». */
  readonly name: string;
  /** Service météo qui produit le modèle. */
  readonly provider: string;
  /** Identifiant à passer au paramètre `models` d'Open-Meteo. */
  readonly openMeteoId: string;
  /** Portée utile mesurée, en heures après le run : au-delà, le modèle ne donne plus rien. */
  readonly horizonHours: number;
  /** Intervalle entre deux runs, en heures. */
  readonly updateEveryHours: number;
  /**
   * Plus longue échéance, en jours, que l'historique d'Open-Meteo (API Previous Runs) conserve
   * pour ce modèle : au-delà, ses prévisions ne peuvent pas être vérifiées par cette voie.
   */
  readonly historyLeadDays: number;
};

export const MODELS = [
  {
    id: 'arome',
    name: 'AROME',
    provider: 'Météo-France',
    openMeteoId: 'meteofrance_arome_france',
    horizonHours: 51,
    updateEveryHours: 3,
    historyLeadDays: 1,
  },
  {
    id: 'arpege',
    name: 'ARPEGE',
    provider: 'Météo-France',
    openMeteoId: 'meteofrance_arpege_europe',
    horizonHours: 102,
    updateEveryHours: 6,
    historyLeadDays: 3,
  },
  {
    id: 'ifs',
    name: 'IFS',
    provider: 'ECMWF',
    openMeteoId: 'ecmwf_ifs',
    horizonHours: 360,
    updateEveryHours: 6,
    historyLeadDays: 7,
  },
  {
    id: 'icon',
    name: 'ICON',
    provider: 'DWD',
    openMeteoId: 'dwd_icon_seamless',
    horizonHours: 180,
    updateEveryHours: 6,
    historyLeadDays: 6,
  },
  {
    id: 'gfs',
    name: 'GFS',
    provider: 'NOAA',
    openMeteoId: 'ncep_gfs_global',
    horizonHours: 384,
    updateEveryHours: 6,
    historyLeadDays: 7,
  },
] as const satisfies readonly Model[];

/** Un modèle de la configuration : son identifiant est connu du contrat. */
export type ConfiguredModel = (typeof MODELS)[number];
export type ModelId = ConfiguredModel['id'];

export const MODEL_IDS = MODELS.map((model) => model.id) as [ModelId, ...ModelId[]];
