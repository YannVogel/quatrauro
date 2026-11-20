// Exporte en PNG les sources SVG de l'icône.
// Usage : npm run brand:export
//
// L'export remplace les icônes de `assets/`, qui sont compilées dans l'app : après un
// changement du dessin, il faut reconstruire l'app.

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

import { EXPORT_PLAN } from './plan.ts';

const root = path.join(import.meta.dirname, '..', '..');

for (const step of EXPORT_PLAN) {
  const svg = await readFile(path.join(root, step.source));
  await sharp(svg).resize(step.size, step.size).png().toFile(path.join(root, step.target));
  console.log(`${step.source} → ${step.target} (${step.size} px)`);
}
