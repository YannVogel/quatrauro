// L'app n'appelle aucune API météo : tout passe par les fichiers que le pipeline publie.
// Ce test parcourt le code de l'app à la recherche des adresses des sources de données.

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SOURCE = /\.(ts|tsx)$/;
/** Serveurs que seul le pipeline a le droit d'interroger. */
const WEATHER_HOSTS =
  /open-meteo\.com|meteofrance\.s3|data\.gouv\.fr\/api|portail-api\.meteofrance/;

function sourcesOf(directory: string): string[] {
  return readdirSync(path.join(ROOT, directory), { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourcesOf(relative);
    return SOURCE.test(entry.name) ? [relative] : [];
  });
}

describe("l'app", () => {
  const files = [...sourcesOf('app'), ...sourcesOf('src')];

  it('ne contient l’adresse d’aucune API météo', () => {
    expect(files.length).toBeGreaterThan(20);
    const offenders = files.filter((file) =>
      WEATHER_HOSTS.test(readFileSync(path.join(ROOT, file), 'utf8')),
    );
    expect(offenders).toEqual([]);
  });

  it('n’appelle le réseau qu’à un seul endroit : la lecture des fichiers publiés', () => {
    const callers = files
      .filter((file) => !file.includes('__tests__') && !file.includes('/testing/'))
      .filter((file) => /\bfetch\(/.test(readFileSync(path.join(ROOT, file), 'utf8')));
    expect(callers).toEqual([path.join('src', 'lib', 'data.ts')]);
  });
});
