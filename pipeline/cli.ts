// Arguments des commandes du pipeline : `--cle=valeur` et `--drapeau`.

/** Dossier de données par défaut, pour le développement local (ignoré par git). */
export const DEFAULT_DATA_DIRECTORY = '.data';

export type Arguments = {
  readonly value: (name: string) => string | null;
  readonly flag: (name: string) => boolean;
};

/** Lit les arguments ; refuse ceux qui ne sont pas dans `known`, pour qu'une faute de frappe se voie. */
export function parseArguments(argv: readonly string[], known: readonly string[]): Arguments {
  const values = new Map<string, string>();
  for (const argument of argv) {
    const match = /^--([a-z-]+)(?:=(.*))?$/.exec(argument);
    const name = match?.[1];
    if (name === undefined || !known.includes(name)) {
      throw new Error(
        `Argument inconnu : ${argument}. Arguments acceptés : ${known.map((entry) => `--${entry}`).join(', ')}`,
      );
    }
    values.set(name, match?.[2] ?? '');
  }
  return {
    value: (name) => {
      const value = values.get(name);
      return value === undefined || value === '' ? null : value;
    },
    flag: (name) => values.has(name),
  };
}
