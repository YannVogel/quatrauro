import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { colors } from '@/ui/theme';

import createConfig from '../app.config';
import { ICON_VARIANTS, exportPlan, isIconVariant } from '../scripts/brand/variants';

const ROOT = path.join(__dirname, '..');
const HEX_COLOR = /#[0-9A-Fa-f]{6}\b/g;

const config = createConfig({
  config: { name: '', slug: '' },
  projectRoot: '',
  staticConfigPath: null,
  packageJsonPath: null,
});

describe("variantes de l'icône", () => {
  it.each(ICON_VARIANTS)('« %s » a toutes ses sources SVG', (variant) => {
    for (const step of exportPlan(variant)) {
      expect(existsSync(path.join(ROOT, step.source))).toBe(true);
    }
  });

  it.each(ICON_VARIANTS)("« %s » n'utilise que des couleurs du thème clair", (variant) => {
    const palette = Object.values(colors.light).map((color) => color.toUpperCase());
    for (const step of exportPlan(variant)) {
      const svg = readFileSync(path.join(ROOT, step.source), 'utf8');
      for (const color of svg.match(HEX_COLOR) ?? [])
        expect(palette).toContain(color.toUpperCase());
    }
  });

  it.each(ICON_VARIANTS)(
    '« %s » a une version monochrome sans autre couleur que le blanc',
    (variant) => {
      const svg = readFileSync(path.join(ROOT, `assets/icon/${variant}/monochrome.svg`), 'utf8');
      expect(new Set(svg.match(HEX_COLOR))).toEqual(new Set(['#FFFFFF']));
    },
  );

  it('reconnaît une variante et refuse le reste', () => {
    expect(isIconVariant('compass')).toBe(true);
    expect(isIconVariant('licorne')).toBe(false);
    expect(isIconVariant(undefined)).toBe(false);
  });
});

describe("export de l'icône", () => {
  it('écrit les PNG aux chemins que lit app.config.ts', () => {
    const targets = exportPlan('compass').map((step) => step.target);
    const adaptiveIcon = config.android?.adaptiveIcon;
    expect(targets).toContain(path.normalize(config.icon ?? ''));
    expect(targets).toContain(path.normalize(adaptiveIcon?.foregroundImage ?? ''));
    expect(targets).toContain(path.normalize(adaptiveIcon?.monochromeImage ?? ''));
  });

  it('produit des images carrées de 1024 px', () => {
    for (const step of exportPlan('pinwheel')) expect(step.size).toBe(1024);
  });
});
