import { spawnSync } from 'node:child_process';
import path from 'node:path';

const ROOT = path.join(__dirname, '..');
const ESLINT = path.join(ROOT, 'node_modules', 'eslint', 'bin', 'eslint.js');
const COLOR_MESSAGE = 'Aucune couleur en dur';

/** Messages d'ESLint pour un code source, comme s'il était dans le fichier donné. */
function lint(code: string, file: string): string[] {
  const result = spawnSync(
    process.execPath,
    [ESLINT, '--stdin', '--stdin-filename', path.join(ROOT, file), '--format', 'json'],
    { cwd: ROOT, input: code, encoding: 'utf8' },
  );
  const [report] = JSON.parse(result.stdout) as { messages: { message: string }[] }[];
  return (report?.messages ?? []).map((entry) => entry.message);
}

const colorErrors = (code: string, file: string): string[] =>
  lint(code, file).filter((message) => message.includes(COLOR_MESSAGE));

describe('règle ESLint : aucune couleur en dur', () => {
  const component = 'src/features/forecast/components/Exemple.tsx';

  it.each([
    ['hexadécimale', "export const style = { backgroundColor: '#1463FF' };\n"],
    ['hexadécimale courte', "export const style = { borderColor: '#fff' };\n"],
    ['rgba', "export const style = { shadowColor: 'rgba(0, 0, 0, 0.2)' };\n"],
    ['nommée dans un style', "export const style = { color: 'white' };\n"],
    ['dans un gabarit de chaîne', 'export const border = `1px solid #1463FF`;\n'],
  ])('refuse une couleur %s dans un composant', (_, code) => {
    expect(colorErrors(code, component)).toHaveLength(1);
  });

  it('refuse une couleur nommée passée en attribut', () => {
    const code = [
      "import { ActivityIndicator } from 'react-native';",
      '',
      'export function Exemple() {',
      '  return <ActivityIndicator color="red" />;',
      '}',
      '',
    ].join('\n');
    expect(colorErrors(code, component)).toHaveLength(1);
  });

  it('accepte un token du thème, y compris en attribut', () => {
    const code = [
      "import { Text } from '@/ui';",
      '',
      'export function Exemple() {',
      '  return <Text color="textMuted">Bonjour</Text>;',
      '}',
      '',
    ].join('\n');
    expect(colorErrors(code, component)).toEqual([]);
    expect(colorErrors('export const label = { title: "Orange" };\n', component)).toEqual([]);
  });

  it('refuse aussi une couleur dans une route et dans app.config.ts', () => {
    const code = "export const style = { backgroundColor: '#1463FF' };\n";
    expect(colorErrors(code, 'app/exemple.tsx')).toHaveLength(1);
    expect(colorErrors(code, 'app.config.ts')).toHaveLength(1);
  });

  it('accepte les couleurs dans theme.ts, le seul fichier où elles se définissent', () => {
    expect(colorErrors("export const sun = '#FFC93C';\n", 'src/ui/theme.ts')).toEqual([]);
  });
});

describe('règles ESLint de frontière', () => {
  it("interdit à l'app d'importer un module de Node", () => {
    const messages = lint(
      "import fs from 'node:fs';\nexport const x = fs;\n",
      'src/lib/exemple.ts',
    );
    expect(messages.some((message) => message.includes("L'app ne dépend pas de Node"))).toBe(true);
  });

  it('interdit à shared/ de dépendre de React Native ou de Node', () => {
    const code =
      "import { View } from 'react-native';\nimport path from 'node:path';\nexport const x = [View, path];\n";
    const messages = lint(code, 'shared/exemple.ts').filter((message) =>
      message.includes('shared/ ne dépend'),
    );
    expect(messages).toHaveLength(2);
  });
});
