import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { z } from 'zod';

import { directoryStorage, readJson, writeJson } from '../storage.ts';
import type { Storage } from '../storage.ts';
import { temporaryDirectory } from '../testing/scenario.ts';

let root = '';
let storage: Storage;
let cleanup: () => Promise<void> = () => Promise.resolve();

beforeEach(async () => {
  const directory = await temporaryDirectory();
  root = directory.root;
  cleanup = directory.cleanup;
  storage = directoryStorage(root);
});
afterEach(() => cleanup());

describe('stockage sur dossier', () => {
  it('écrit en créant les dossiers, relit, et liste dans l’ordre', async () => {
    await storage.write('archive/b.json', 'deux');
    await storage.write('archive/a.json', 'un');
    await storage.write('archive/sous/c.json', 'trois');
    assert.equal(await storage.read('archive/a.json'), 'un');
    assert.deepEqual(await storage.list('archive'), ['a.json', 'b.json']);
  });

  it('rend null pour un fichier absent et une liste vide pour un dossier absent', async () => {
    assert.equal(await storage.read('state/toulon.json'), null);
    assert.deepEqual(await storage.list('archive/forecasts/toulon'), []);
  });

  it('remplace un fichier sans laisser de fichier temporaire', async () => {
    await storage.write('state/toulon.json', 'avant');
    await storage.write('state/toulon.json', 'après');
    assert.equal(await storage.read('state/toulon.json'), 'après');
    assert.deepEqual(await storage.list('state'), ['toulon.json']);
  });

  it('refuse un chemin qui sort du dossier', async () => {
    await assert.rejects(storage.write('../ailleurs.json', 'x'), /hors du dossier de stockage/);
    await assert.rejects(storage.read('/etc/hosts'), /hors du dossier de stockage/);
  });
});

describe('fichiers JSON', () => {
  const schema = z.object({ value: z.number() });

  it('écrit toujours le même texte pour le même contenu', async () => {
    await writeJson(storage, 'a.json', { value: 1 });
    assert.equal(await storage.read('a.json'), '{"value":1}\n');
    assert.deepEqual(await readJson(storage, 'a.json', schema), { value: 1 });
  });

  it('rend null pour un fichier absent', async () => {
    assert.equal(await readJson(storage, 'absent.json', schema), null);
  });

  it('refuse un fichier illisible ou qui n’a pas la forme attendue', async () => {
    await writeFile(path.join(root, 'casse.json'), '{"value":');
    await writeJson(storage, 'faux.json', { value: 'douze' });
    await assert.rejects(readJson(storage, 'casse.json', schema), /casse\.json n'est pas du JSON/);
    await assert.rejects(readJson(storage, 'faux.json', schema), /Fichier invalide : faux\.json/);
  });
});
