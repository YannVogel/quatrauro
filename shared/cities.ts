// Les villes de Quatrauro : la seule liste. Ajouter une ville, c'est ajouter une entrée ici.
// Coordonnées, altitudes et stations viennent de l'ADR 0002 (docs/features/donnees.md).

export type Station = {
  /** Numéro Météo-France du poste. */
  readonly id: string;
  readonly name: string;
  readonly latitude: number;
  readonly longitude: number;
  /** Altitude du pied de l'abri, en mètres. */
  readonly elevation: number;
  /** Département du fichier horaire de Météo-France qui contient la station. */
  readonly department: string;
};

export type City = {
  readonly id: string;
  readonly name: string;
  /** Point de prévision demandé à Open-Meteo : le centre-ville. */
  readonly latitude: number;
  readonly longitude: number;
  /** Altitude du point de prévision, en mètres. */
  readonly elevation: number;
  /** Station d'observation de référence : c'est elle que la prévision corrigée décrit. */
  readonly station: Station;
};

export const CITIES = [
  {
    id: 'toulon',
    name: 'Toulon',
    latitude: 43.1257,
    longitude: 5.9304,
    elevation: 11,
    station: {
      id: '83137001',
      name: 'TOULON',
      latitude: 43.114,
      longitude: 5.9005,
      elevation: 3,
      department: '83',
    },
  },
  {
    id: 'nice',
    name: 'Nice',
    latitude: 43.6973,
    longitude: 7.2702,
    elevation: 10,
    station: {
      id: '06088001',
      name: 'NICE',
      latitude: 43.648833,
      longitude: 7.209,
      elevation: 2,
      department: '06',
    },
  },
] as const satisfies readonly City[];

/** Une ville de la configuration : son identifiant est connu du contrat. */
export type ConfiguredCity = (typeof CITIES)[number];
export type CityId = ConfiguredCity['id'];

export const CITY_IDS = CITIES.map((city) => city.id) as [CityId, ...CityId[]];

export function findCity(id: CityId): City {
  const city = CITIES.find((candidate) => candidate.id === id);
  if (city === undefined) throw new Error(`Ville inconnue : ${id}`);
  return city;
}
