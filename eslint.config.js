// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*'],
  },
  {
    rules: {
      // Regla pensada para React Compiler, que este proyecto no activa
      // (app.json no tiene experiments.reactCompiler). Marca el patrón
      // "reiniciar el formulario cuando el modal se abre" que usan
      // varios modales y sheets. Se deja como aviso hasta reescribirlos
      // (key por apertura o estado derivado) con prueba en dispositivo.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
]);
