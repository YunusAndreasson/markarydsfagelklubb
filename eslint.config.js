// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'android/*', 'ios/*', '.expo/*', 'supabase/**', 'expo-env.d.ts'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      // Type-aware checks that catch real async/control-flow bugs without forcing
      // style churn. `void somePromise()` remains the explicit fire-and-forget
      // escape hatch for native APIs and telemetry.
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-floating-promises': [
        'error',
        { ignoreVoid: true, ignoreIIFE: true },
      ],
      '@typescript-eslint/no-for-in-array': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: false },
      ],
      // `tsc` already proves every `Namespace.member` exists. The import plugin
      // re-derives it from a dependency's compiled JS and decides "is this an ES
      // module?" with a line-start regex — SDK 58's Expo packages emit
      // `* */ export var …`, so it skips the file and reports real exports
      // (`Notifications.AndroidImportance`) as missing.
      'import/namespace': 'off',
    },
  },
]);
