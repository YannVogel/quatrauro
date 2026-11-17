// https://docs.expo.dev/guides/using-eslint/
const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

/** Modules réservés à Node : interdits dans le code qui tourne sur le téléphone. */
const NODE_ONLY = ['node:*', 'fs', 'fs/*', 'path', 'zlib', 'readline', 'child_process', 'os'];
/** `shared/` ne dépend de rien d'autre que lui-même. */
const OUTSIDE_SHARED = ['react', 'react-native', 'react-native/*', 'expo', 'expo-*', '@/*'];

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
