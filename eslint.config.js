// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*'],
  },
  {
    // El motor del Excel es el mismo archivo en Desktop, Web y Mobile, y en
    // Desktop hace falta su `eslint-disable no-control-regex`; aquí esa
    // regla no está activa y el comentario saldría como directiva sin uso.
    files: ['src/lib/templates/overtimeTemplate.ts'],
    linterOptions: { reportUnusedDisableDirectives: 'off' },
  },
]);
