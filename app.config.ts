import type { ConfigContext, ExpoConfig } from 'expo/config';

const APP_ID = 'com.parallaxworks.quatrauro';

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
  plugins: ['expo-router'],
  experiments: {
    typedRoutes: true,
  },
});
