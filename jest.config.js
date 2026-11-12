// Pruebas de lógica pura y de src/db (sobre node:sqlite, ver src/__mocks__): Jest en Node, con
// babel-preset-expo, el mismo Babel que usa Metro. No usa el preset
// jest-expo: con SDK 57, expo-modules-core queda dentro de
// expo/node_modules y el setup de jest-expo no lo encuentra.

// Zona horaria fija para que las pruebas de fechas den lo mismo en la Mac
// de Jorge y en la CI: la de Colombia, donde aparecieron los bugs de "hoy"
// en UTC (de 7 p. m. a medianoche ya es mañana en UTC).
process.env.TZ = 'America/Bogota';

const babelPresetExpo = require.resolve('babel-preset-expo', { paths: [require.resolve('expo/package.json')] });

module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  transform: {
    '\\.[jt]sx?$': ['babel-jest', { presets: [babelPresetExpo], babelrc: false, configFile: false }],
  },
  // `react-native-markdown-display` se publica como fuente ESM sin compilar.
  // Su parser (sin React Native) se prueba en src/lib/markdownRender.test.ts.
  transformIgnorePatterns: ['/node_modules/(?!react-native-markdown-display/)'],
};
