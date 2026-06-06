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
    },
  },
]);
