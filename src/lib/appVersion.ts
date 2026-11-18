import Constants from 'expo-constants';

/**
 * Version de l'app, celle que déclare `app.config.ts`. Dans un build, c'est la configuration
 * embarquée ; après une mise à jour, celle de la mise à jour. `null` si elle n'est pas lisible.
 */
export const appVersion: string | null = Constants.expoConfig?.version ?? null;
