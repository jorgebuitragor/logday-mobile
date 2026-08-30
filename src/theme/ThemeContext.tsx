import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { dark, highContrast, light, nordic, oled, sepia, visualRest, type ThemeTokens } from './tokens';

// 'system' resuelve siempre a claro/oscuro simple según el SO — mismo
// criterio que desktop/logday-web, donde 'system' es una entrada más
// de `BuiltInTheme`, no una opción que además pueda "seguir al SO
// entre los 5 temas especiales" (esos se eligen a mano).
export type ThemePreference = 'system' | 'light' | 'dark' | 'high-contrast' | 'visual-rest' | 'sepia' | 'oled' | 'nordic';

const STORAGE_KEY = 'themePreference';

const VALID_PREFERENCES: ThemePreference[] = ['system', 'light', 'dark', 'high-contrast', 'visual-rest', 'sepia', 'oled', 'nordic'];

export type ResolvedScheme = 'light' | 'dark';

// Qué tokens usa cada tema concreto (todo menos 'system', que se
// resuelve aparte contra `useColorScheme()`).
const TOKENS_BY_THEME: Record<Exclude<ThemePreference, 'system'>, ThemeTokens> = {
  light,
  dark,
  'high-contrast': highContrast,
  'visual-rest': visualRest,
  sepia,
  oled,
  nordic,
};

// Base claro/oscuro de cada tema concreto — para la barra de estado
// (íconos claros sobre temas oscuros, oscuros sobre temas claros) y
// para cualquier otra decisión binaria que necesite "es este tema
// fundamentalmente oscuro o claro" sin importar cuál de los 8 sea.
// Mismo concepto que `CustomTheme.base` en desktop, aplicado acá a
// los temas fijos (que no tienen ese campo explícito).
const SCHEME_BY_THEME: Record<Exclude<ThemePreference, 'system'>, ResolvedScheme> = {
  light: 'light',
  dark: 'dark',
  'high-contrast': 'dark',
  'visual-rest': 'dark',
  sepia: 'light',
  oled: 'dark',
  nordic: 'dark',
};

interface ThemeContextValue {
  tokens: ThemeTokens;
  scheme: ResolvedScheme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

const defaultValue: ThemeContextValue = {
  tokens: dark,
  scheme: 'dark',
  preference: 'system',
  setPreference: () => {},
};

const ThemeCtx = createContext<ThemeContextValue>(defaultValue);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const colorScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored && (VALID_PREFERENCES as string[]).includes(stored)) {
        setPreferenceState(stored as ThemePreference);
      }
    });
  }, []);

  function setPreference(next: ThemePreference) {
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
  }

  const effectiveScheme: ResolvedScheme =
    preference === 'system' ? (colorScheme === 'light' ? 'light' : 'dark') : SCHEME_BY_THEME[preference];

  const tokens = useMemo(() => {
    if (preference === 'system') return effectiveScheme === 'light' ? light : dark;
    return TOKENS_BY_THEME[preference];
  }, [preference, effectiveScheme]);

  const value = useMemo(
    () => ({ tokens, scheme: effectiveScheme, preference, setPreference }),
    [tokens, effectiveScheme, preference]
  );

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme(): ThemeTokens {
  return useContext(ThemeCtx).tokens;
}

export function useThemeScheme(): ResolvedScheme {
  return useContext(ThemeCtx).scheme;
}

export function useThemePreference(): Pick<ThemeContextValue, 'preference' | 'setPreference'> {
  const { preference, setPreference } = useContext(ThemeCtx);
  return { preference, setPreference };
}
