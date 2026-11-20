// Permet à ce fichier d'importer d'autres fichiers TypeScript (ici les tokens du thème).
import 'tsx/cjs';

import type { ConfigContext, ExpoConfig } from 'expo/config';

import { FONT_FAMILY, colors } from './src/ui/theme';

const APP_ID = 'com.parallaxworks.quatrauro';

/**
 * Identifiant du projet chez Expo (`@yannvogel/quatrauro`), donné par `eas init` (voir le README).
 * Ce n'est pas un secret. S'il est absent, les mises à jour EAS sont désactivées.
 */
const EAS_PROJECT_ID: string | null = '1a2abfd4-463f-411f-9bf5-e6244a22a070';

/** Réglages qui dépendent du projet Expo : mises à jour JavaScript sans réinstaller l'app. */
function easConfig(projectId: string | null): Pick<ExpoConfig, 'updates' | 'extra'> {
  if (projectId === null) return { updates: { enabled: false } };
  return {
    updates: { url: `https://u.expo.dev/${projectId}` },
    extra: { eas: { projectId } },
  };
}

const OUTFIT = 'node_modules/@expo-google-fonts/outfit';
/** Graisses d'Outfit embarquées dans l'app (docs/design/riviera.md). */
const OUTFIT_FONTS = [
  { path: `${OUTFIT}/400Regular/Outfit_400Regular.ttf`, weight: 400 },
  { path: `${OUTFIT}/500Medium/Outfit_500Medium.ttf`, weight: 500 },
  { path: `${OUTFIT}/600SemiBold/Outfit_600SemiBold.ttf`, weight: 600 },
  { path: `${OUTFIT}/700Bold/Outfit_700Bold.ttf`, weight: 700 },
];

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Quatrauro',
  slug: 'quatrauro',
  version: '0.1.0',
  scheme: 'quatrauro',
  orientation: 'portrait',
  // Les deux thèmes sont livrés : l'app suit le réglage du système.
  userInterfaceStyle: 'automatic',
  // Une mise à jour JavaScript ne s'applique qu'aux builds de la même version de l'app.
  runtimeVersion: { policy: 'appVersion' },
  ...easConfig(EAS_PROJECT_ID),
  icon: './assets/icon.png',
  android: {
    package: APP_ID,
    adaptiveIcon: {
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundColor: colors.light.heroClear,
      monochromeImage: './assets/android-icon-monochrome.png',
    },
  },
  plugins: [
    'expo-router',
    // La police est compilée dans l'app : elle est disponible dès le premier affichage.
    [
      'expo-font',
      { android: { fonts: [{ fontFamily: FONT_FAMILY, fontDefinitions: OUTFIT_FONTS }] } },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
});
