import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'confirmDestructiveActions';
// Mismo default que task-manager (src/store/appStore.ts): true.
const DEFAULT_VALUE = true;

interface PreferencesContextValue {
  confirmDestructiveActions: boolean;
  setConfirmDestructiveActions: (value: boolean) => void;
}

const PreferencesCtx = createContext<PreferencesContextValue>({
  confirmDestructiveActions: DEFAULT_VALUE,
  setConfirmDestructiveActions: () => {},
});

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [confirmDestructiveActions, setState] = useState(DEFAULT_VALUE);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'true' || stored === 'false') {
        setState(stored === 'true');
      }
    });
  }, []);

  function setConfirmDestructiveActions(value: boolean) {
    setState(value);
    AsyncStorage.setItem(STORAGE_KEY, String(value));
  }

  const value = useMemo(
    () => ({ confirmDestructiveActions, setConfirmDestructiveActions }),
    [confirmDestructiveActions]
  );

  return <PreferencesCtx.Provider value={value}>{children}</PreferencesCtx.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  return useContext(PreferencesCtx);
}
