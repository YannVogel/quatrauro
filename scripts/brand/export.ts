// Exporte en PNG les sources SVG de la variante d'icône choisie.
// Usage : npm run brand:export -- <variante>
//
// À ne lancer qu'une fois la variante choisie par Yann : l'export remplace les icônes de
// `assets/`, qui sont compilées dans l'app.

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

import { ICON_VARIANTS, exportPlan, isIconVariant } from './variants.ts';

const root = path.join(import.meta.dirname, '..', '..');
const variant = process.argv[2];

if (!isIconVariant(variant)) {
  console.error(`Variante attendue : ${ICON_VARIANTS.join(', ')}. Reçu : ${variant ?? 'rien'}.`);
  process.exit(1);
}

for (const step of exportPlan(variant)) {
  const svg = await readFile(path.join(root, step.source));
  await sharp(svg).resize(step.size, step.size).png().toFile(path.join(root, step.target));
  console.log(`${step.source} → ${step.target} (${step.size} px)`);
}
