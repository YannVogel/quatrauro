// Petite interface de stockage : le pipeline lit et écrit des fichiers texte désignés par un
// chemin relatif (`state/toulon.json`). En production c'est le dossier de la branche `data` ;
// dans les tests, un dossier temporaire. Rien ici ne connaît git.

import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { z } from 'zod';

export type Storage = {
  /** Contenu du fichier, ou `null` s'il n'existe pas. */
  read(file: string): Promise<string | null>;
  write(file: string, content: string): Promise<void>;
  /** Noms des fichiers d'un dossier, triés ; liste vide si le dossier n'existe pas. */
  list(directory: string): Promise<string[]>;
};

const isMissing = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';

export function directoryStorage(root: string): Storage {
  const resolve = (relative: string): string => {
    const absolute = path.resolve(root, relative);
    if (absolute !== path.resolve(root) && !absolute.startsWith(path.resolve(root) + path.sep)) {
      throw new Error(`Chemin hors du dossier de stockage : ${relative}`);
    }
    return absolute;
  };
  return {
    async read(file) {
      try {
        return await readFile(resolve(file), 'utf8');
      } catch (error) {
        if (isMissing(error)) return null;
        throw error;
      }
    },
    async write(file, content) {
      const target = resolve(file);
      await mkdir(path.dirname(target), { recursive: true });
      // Écriture puis renommage : un fichier n'est jamais lu à moitié écrit.
      const temporary = `${target}.tmp`;
      await writeFile(temporary, content);
      await rename(temporary, target);
    },
    async list(directory) {
      try {
        const entries = await readdir(resolve(directory), { withFileTypes: true });
        const names: string[] = [];
        for (const entry of entries) {
          if (entry.isFile() && !entry.name.endsWith('.tmp')) names.push(entry.name);
        }
        return names.sort();
      } catch (error) {
        if (isMissing(error)) return [];
        throw error;
      }
    },
  };
}

/** Lit et valide un fichier JSON ; `null` s'il n'existe pas. Un fichier invalide lève une erreur. */
export async function readJson<Schema extends z.ZodType>(
  storage: Storage,
  file: string,
  schema: Schema,
): Promise<z.infer<Schema> | null> {
  const content = await storage.read(file);
  if (content === null) return null;
  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch (error) {
    throw new Error(`Fichier illisible : ${file} n'est pas du JSON`, { cause: error });
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new Error(`Fichier invalide : ${file} : ${parsed.error.issues[0]?.message ?? ''}`, {
      cause: parsed.error,
    });
  }
  return parsed.data;
}

/** Écrit un fichier JSON, toujours de la même façon : deux écritures du même contenu sont identiques. */
export async function writeJson(storage: Storage, file: string, value: unknown): Promise<void> {
  await storage.write(file, `${JSON.stringify(value)}\n`);
}

export type BufferedStorage = Storage & {
  /** Chemins écrits depuis la création, triés. */
  readonly pending: () => string[];
  /** Reporte toutes les écritures sur le stockage d'origine. */
  readonly commit: () => Promise<void>;
};

/**
 * Stockage qui lit dans `base` mais garde ses écritures en mémoire jusqu'à `commit`. Un passage
 * travaille dessus : s'il échoue en route, rien n'a touché aux fichiers, et les précédents
 * restent en place.
 */
export function bufferedStorage(base: Storage): BufferedStorage {
  const written = new Map<string, string>();
  const normalize = (file: string): string => path.posix.normalize(file);
  return {
    read: async (file) => written.get(normalize(file)) ?? (await base.read(file)),
    write: (file, content) => {
      written.set(normalize(file), content);
      return Promise.resolve();
    },
    async list(directory) {
      const prefix = `${normalize(directory)}/`;
      const names = new Set(await base.list(directory));
      for (const file of written.keys()) {
        const name = file.startsWith(prefix) ? file.slice(prefix.length) : null;
        if (name !== null && !name.includes('/')) names.add(name);
      }
      return [...names].sort();
    },
    pending: () => [...written.keys()].sort(),
    async commit() {
      for (const [file, content] of [...written].sort(([a], [b]) => a.localeCompare(b))) {
        await base.write(file, content);
      }
      written.clear();
    },
  };
}
