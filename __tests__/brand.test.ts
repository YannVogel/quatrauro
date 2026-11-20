import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { colors } from '@/ui/theme';

import createConfig from '../app.config';
import { EXPORT_PLAN } from '../scripts/brand/plan';

const ROOT = path.join(__dirname, '..');
const HEX_COLOR = /#[0-9A-Fa-f]{6}\b/g;

const config = createConfig({
  config: { name: '', slug: '' },
  projectRoot: '',
  staticConfigPath: null,
  packageJsonPath: null,
});

const readSource = (name: string): string =>
  readFileSync(path.join(ROOT, `assets/icon/${name}.svg`), 'utf8');

describe("sources de l'icône", () => {
  it('a toutes ses sources SVG', () => {
    for (const step of EXPORT_PLAN) {
      expect(existsSync(path.join(ROOT, step.source))).toBe(true);
    }
  });

  it("n'utilise que des couleurs du thème clair", () => {
    const palette = Object.values(colors.light).map((color) => color.toUpperCase());
    for (const step of EXPORT_PLAN) {
      const svg = readFileSync(path.join(ROOT, step.source), 'utf8');
      for (const color of svg.match(HEX_COLOR) ?? [])
        expect(palette).toContain(color.toUpperCase());
    }
  });

  it('a une version monochrome sans autre couleur que le blanc', () => {
    expect(new Set(readSource('monochrome').match(HEX_COLOR))).toEqual(new Set(['#FFFFFF']));
  });

  // Le fond de l'icône adaptative vient d'app.config.ts : un fond dessiné ici le masquerait.
  it.each(['foreground', 'monochrome'])('laisse « %s » sans fond', (name) => {
    expect(readSource(name)).not.toContain('<rect');
  });
});

describe("export de l'icône", () => {
  const adaptiveIcon = config.android?.adaptiveIcon;

  it('écrit les PNG aux chemins que lit app.config.ts', () => {
    const targets = EXPORT_PLAN.map((step) => step.target);
    expect(targets).toContain(path.normalize(config.icon ?? ''));
    expect(targets).toContain(path.normalize(adaptiveIcon?.foregroundImage ?? ''));
    expect(targets).toContain(path.normalize(adaptiveIcon?.monochromeImage ?? ''));
  });

  it('produit des images carrées de 1024 px', () => {
    for (const step of EXPORT_PLAN) expect(step.size).toBe(1024);
  });

  it('a ses PNG dans le repo', () => {
    for (const step of EXPORT_PLAN) {
      expect(existsSync(path.join(ROOT, step.target))).toBe(true);
    }
  });
});

describe('écran de démarrage', () => {
  type SplashOptions = {
    image: string;
    backgroundColor: string;
    dark: { image: string; backgroundColor: string };
  };

  const splash = config.plugins?.find(
    (plugin): plugin is [string, SplashOptions] =>
      Array.isArray(plugin) && plugin[0] === 'expo-splash-screen',
  )?.[1];

  it("montre une image que l'export produit, dans les deux thèmes", () => {
    const targets = EXPORT_PLAN.map((step) => step.target);
    expect(targets).toContain(path.normalize(splash?.image ?? ''));
    expect(splash?.dark.image).toBe(splash?.image);
  });

  it("a pour fond le bleu du bloc d'état de chaque thème", () => {
    expect(splash?.backgroundColor).toBe(colors.light.heroClear);
    expect(splash?.dark.backgroundColor).toBe(colors.dark.heroClear);
  });
});

describe('icône adaptative', () => {
  it("a pour fond le bleu du bloc d'état, sans image de fond", () => {
    const adaptiveIcon = config.android?.adaptiveIcon;
    expect(adaptiveIcon?.backgroundColor).toBe(colors.light.heroClear);
    expect(adaptiveIcon?.backgroundImage).toBeUndefined();
  });
});
