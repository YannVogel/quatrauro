// https://docs.expo.dev/guides/using-eslint/
const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

/** Modules réservés à Node : interdits dans le code qui tourne sur le téléphone. */
const NODE_ONLY = ['node:*', 'fs', 'fs/*', 'path', 'zlib', 'readline', 'child_process', 'os'];
/** `shared/` ne dépend de rien d'autre que lui-même. */
const OUTSIDE_SHARED = ['react', 'react-native', 'react-native/*', 'expo', 'expo-*', '@/*'];

const COLOR_MESSAGE = 'Aucune couleur en dur : lire le thème (src/ui/theme.ts).';
const COLOR_PROPERTY = '(?:color|\\w+Color|fill|stroke)';
const NAMED_COLOR =
  '(?:transparent|black|white|silver|gray|grey|red|maroon|orange|yellow|gold|olive|lime|green|teal|aqua|cyan|blue|navy|indigo|purple|violet|fuchsia|magenta|pink|brown|beige|ivory)';
/** Littéraux de couleur : notation hexadécimale ou fonctionnelle partout, noms de couleur dans une propriété de couleur. */
const COLOR_LITERALS = [
  'Literal[value=/^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i]',
  'Literal[value=/^(?:rgb|rgba|hsl|hsla|hwb)\\(/i]',
  'TemplateElement[value.raw=/#(?:[0-9a-f]{6}|[0-9a-f]{8})\\b|(?:rgb|rgba|hsl|hsla|hwb)\\(/i]',
  `Property[key.name=/^${COLOR_PROPERTY}$/] > Literal[value=/^${NAMED_COLOR}$/i]`,
  `JSXAttribute[name.name=/^${COLOR_PROPERTY}$/] > Literal[value=/^${NAMED_COLOR}$/i]`,
];

module.exports = defineConfig([
  globalIgnores([
    'dist/*',
    '.expo/*',
    'coverage/*',
    'android/*',
    'ios/*',
    'docs/design/claude-design/*',
    'pipeline/backtest/.cache/*',
  ]),
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    files: ['app/**', 'src/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: NODE_ONLY, message: "L'app ne dépend pas de Node." }] },
      ],
    },
  },
  {
    files: ['app/**', 'src/**', 'app.config.ts'],
    ignores: ['src/ui/theme.ts', '**/__tests__/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...COLOR_LITERALS.map((selector) => ({ selector, message: COLOR_MESSAGE })),
      ],
    },
  },
  {
    files: ['shared/**'],
    ignores: ['shared/**/__tests__/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [...NODE_ONLY, ...OUTSIDE_SHARED],
              message: 'shared/ ne dépend ni de Node, ni de React Native, ni du reste du repo.',
            },
          ],
        },
      ],
    },
  },
]);
