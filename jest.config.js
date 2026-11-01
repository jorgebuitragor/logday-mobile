// Pruebas de lógica pura (src/lib/templates, por ahora): Jest en Node, con
// babel-preset-expo, el mismo Babel que usa Metro. No usa el preset
// jest-expo: con SDK 57, expo-modules-core queda dentro de
// expo/node_modules y el setup de jest-expo no lo encuentra.
const babelPresetExpo = require.resolve('babel-preset-expo', { paths: [require.resolve('expo/package.json')] });

module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  transform: {
    '\\.[jt]sx?$': ['babel-jest', { presets: [babelPresetExpo], babelrc: false, configFile: false }],
  },
};
