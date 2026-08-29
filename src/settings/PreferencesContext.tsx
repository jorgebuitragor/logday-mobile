import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const CONFIRM_STORAGE_KEY = 'confirmDestructiveActions';
// Mismo default que task-manager (src/store/appStore.ts): true.
const CONFIRM_DEFAULT = true;

export type TimeFormat = '24h' | '12h';
const TIME_FORMAT_STORAGE_KEY = 'timeFormat';
// Sin equivalente en desktop (usa el <input type="time"> nativo del
// navegador, que sigue el locale del SO). Default 12h por pedido
// explícito del usuario (2026-08-29) — el dato sigue guardándose
// siempre en 24h (`HH:MM`) sin importar esta preferencia, ver
// AppTimePicker.tsx.
const TIME_FORMAT_DEFAULT: TimeFormat = '12h';

interface PreferencesContextValue {
  confirmDestructiveActions: boolean;
  setConfirmDestructiveActions: (value: boolean) => void;
  timeFormat: TimeFormat;
  setTimeFormat: (value: TimeFormat) => void;
}

const PreferencesCtx = createContext<PreferencesContextValue>({
  confirmDestructiveActions: CONFIRM_DEFAULT,
  setConfirmDestructiveActions: () => {},
  timeFormat: TIME_FORMAT_DEFAULT,
  setTimeFormat: () => {},
});

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [confirmDestructiveActions, setConfirmState] = useState(CONFIRM_DEFAULT);
  const [timeFormat, setTimeFormatState] = useState<TimeFormat>(TIME_FORMAT_DEFAULT);

  useEffect(() => {
    AsyncStorage.getItem(CONFIRM_STORAGE_KEY).then((stored) => {
      if (stored === 'true' || stored === 'false') {
        setConfirmState(stored === 'true');
      }
    });
    AsyncStorage.getItem(TIME_FORMAT_STORAGE_KEY).then((stored) => {
      if (stored === '24h' || stored === '12h') {
        setTimeFormatState(stored);
      }
    });
  }, []);

  function setConfirmDestructiveActions(value: boolean) {
    setConfirmState(value);
    AsyncStorage.setItem(CONFIRM_STORAGE_KEY, String(value));
  }

  function setTimeFormat(value: TimeFormat) {
    setTimeFormatState(value);
    AsyncStorage.setItem(TIME_FORMAT_STORAGE_KEY, value);
  }

  const value = useMemo(
    () => ({ confirmDestructiveActions, setConfirmDestructiveActions, timeFormat, setTimeFormat }),
    [confirmDestructiveActions, timeFormat]
  );

  return <PreferencesCtx.Provider value={value}>{children}</PreferencesCtx.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  return useContext(PreferencesCtx);
}
