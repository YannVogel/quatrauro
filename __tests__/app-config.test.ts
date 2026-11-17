import type { ExpoConfig } from 'expo/config';

import createConfig from '../app.config';
import easJson from '../eas.json';

const config: ExpoConfig = createConfig({
  config: { name: '', slug: '' },
  projectRoot: '',
  staticConfigPath: null,
  packageJsonPath: null,
});

describe("identité de l'app", () => {
  it("porte le nom, l'identifiant et le scheme de Quatrauro", () => {
    expect(config.name).toBe('Quatrauro');
    expect(config.slug).toBe('quatrauro');
    expect(config.scheme).toBe('quatrauro');
    expect(config.android?.package).toBe('com.parallaxworks.quatrauro');
  });

  it('suit le thème du système', () => {
    expect(config.userInterfaceStyle).toBe('automatic');
  });

  it('embarque les quatre graisses de la police Outfit', () => {
    const fontPlugin = config.plugins?.find(
      (
        plugin,
      ): plugin is [string, { android: { fonts: { fontDefinitions: { weight: number }[] }[] } }] =>
        Array.isArray(plugin) && plugin[0] === 'expo-font',
    );
    const weights = fontPlugin?.[1].android.fonts[0]?.fontDefinitions.map((font) => font.weight);
    expect(weights).toEqual([400, 500, 600, 700]);
  });
});

describe('builds et mises à jour', () => {
  it('lie une mise à jour JavaScript à la version de l’app', () => {
    expect(config.runtimeVersion).toEqual({ policy: 'appVersion' });
  });

  it("n'active les mises à jour qu'une fois le projet Expo créé", () => {
    // Tant que `eas init` n'a pas été lancé, aucun identifiant de projet n'existe.
    const isLinked = config.extra?.eas?.projectId !== undefined;
    if (isLinked) {
      expect(config.updates?.url).toBe(`https://u.expo.dev/${config.extra?.eas?.projectId}`);
    } else {
      expect(config.updates).toEqual({ enabled: false });
    }
  });

  it('construit un client de développement et un APK de distribution interne', () => {
    expect(easJson.build.development).toEqual({
      developmentClient: true,
      distribution: 'internal',
    });
    expect(easJson.build.preview.distribution).toBe('internal');
    expect(easJson.build.preview.android.buildType).toBe('apk');
  });

  it('publie les mises à jour sur le canal « preview »', () => {
    expect(easJson.build.preview.channel).toBe('preview');
  });

  it("n'a pas de profil de production : l'app ne va pas sur les stores", () => {
    expect(Object.keys(easJson.build).sort()).toEqual(['development', 'preview']);
  });
});
