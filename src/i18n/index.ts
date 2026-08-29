import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import es from './locales/es.json';

export const SUPPORTED_LANGUAGES = ['es', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const STORAGE_KEY = 'languagePreference';

function isSupportedLanguage(value: string | null | undefined): value is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(value as SupportedLanguage);
}

const deviceLanguage = Localization.getLocales()[0]?.languageCode;
const initialLanguage = isSupportedLanguage(deviceLanguage) ? deviceLanguage : 'es';

i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
  },
  lng: initialLanguage,
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
});

// El idioma persistido (elegido manualmente en Ajustes) puede diferir
// del detectado por dispositivo con el que ya se inicializó i18n arriba
// (necesario de forma síncrona para el primer render) — si hay uno
// guardado, se aplica apenas se lee de AsyncStorage. Puede causar un
// flash breve del idioma de dispositivo antes del guardado; aceptado
// por simplicidad, ver specs/i18n/design.md.
AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
  if (isSupportedLanguage(stored) && stored !== i18n.language) {
    i18n.changeLanguage(stored);
  }
});

export function setLanguagePreference(language: SupportedLanguage): void {
  i18n.changeLanguage(language);
  AsyncStorage.setItem(STORAGE_KEY, language);
}

export default i18n;
