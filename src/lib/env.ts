// Configuration de l'app lue dans l'environnement. Rien de secret ici : le repo est public et
// les variables `EXPO_PUBLIC_` sont écrites en clair dans l'app.

/** Adresse des fichiers publiés par le pipeline sur la branche `data` (ADR 0004). */
const DEFAULT_DATA_URL = 'https://raw.githubusercontent.com/YannVogel/quatrauro/data';

const withoutTrailingSlash = (url: string): string => url.replace(/\/+$/, '');

export const env = {
  /**
   * Racine des fichiers publiés. `EXPO_PUBLIC_DATA_URL` la remplace en développement, pour lire
   * des fichiers produits en local (voir `.env.example`).
   */
  dataUrl: withoutTrailingSlash(process.env.EXPO_PUBLIC_DATA_URL ?? DEFAULT_DATA_URL),
} as const;
