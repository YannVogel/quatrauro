// Permet à ce fichier d'importer d'autres fichiers TypeScript (ici les tokens du thème).
import 'tsx/cjs';

import type { ConfigContext, ExpoConfig } from 'expo/config';

import { FONT_FAMILY } from './src/ui/theme';

const APP_ID = 'com.parallaxworks.quatrauro';

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
  icon: './assets/icon.png',
  android: {
    package: APP_ID,
    adaptiveIcon: {
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
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
