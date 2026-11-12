// Mock automático de Jest para AsyncStorage (módulo nativo): el que trae
// la propia librería, que guarda en memoria. Las pruebas lo vacían con
// `AsyncStorage.clear()` en `beforeEach`.
export { default } from '@react-native-async-storage/async-storage/jest/async-storage-mock';
