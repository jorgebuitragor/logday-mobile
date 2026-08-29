import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { dark, light, type ThemeTokens } from './tokens';

export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'themePreference';

interface ThemeContextValue {
  tokens: ThemeTokens;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

const defaultValue: ThemeContextValue = {
  tokens: dark,
  preference: 'system',
  setPreference: () => {},
};

const ThemeCtx = createContext<ThemeContextValue>(defaultValue);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const colorScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setPreferenceState(stored);
      }
    });
  }, []);

  function setPreference(next: ThemePreference) {
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
  }

  const effectiveScheme = preference === 'system' ? colorScheme : preference;
  const tokens = useMemo(() => (effectiveScheme === 'light' ? light : dark), [effectiveScheme]);

  const value = useMemo(() => ({ tokens, preference, setPreference }), [tokens, preference]);

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme(): ThemeTokens {
  return useContext(ThemeCtx).tokens;
}

export function useThemePreference(): Pick<ThemeContextValue, 'preference' | 'setPreference'> {
  const { preference, setPreference } = useContext(ThemeCtx);
  return { preference, setPreference };
}
