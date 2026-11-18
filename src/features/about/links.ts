// Pages que l'écran « À propos des données » ouvre dans le navigateur. Ce sont des pages à
// lire, pas des sources de données : l'app n'y télécharge rien.

export const LINKS = {
  /** Lien demandé par Open-Meteo à côté de ses données. */
  openMeteo: 'https://open-meteo.com/',
  ccBy: 'https://creativecommons.org/licenses/by/4.0/deed.fr',
  /** Le jeu de données des observations, chez son producteur. */
  observations: 'https://www.data.gouv.fr/datasets/donnees-climatologiques-de-base-horaires',
  openLicence: 'https://www.data.gouv.fr/pages/legal/licences/etalab-2.0',
  vigilance: 'https://vigilance.meteofrance.fr/fr',
} as const;

export type LinkId = keyof typeof LINKS;
