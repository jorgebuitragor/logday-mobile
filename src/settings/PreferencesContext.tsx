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

// Agregado 2026-08-30 — antes `viewMode` de Tasks/Notes era estado
// local sin persistir (`useState`, ver `vistas-tasks/`/`vistas-notas/`,
// "sin persistir... alcance reducido deliberado"). Pedido explícito
// del usuario: "me gustaría también que las vistas se guarden así
// cierre la app". Mismo mecanismo (AsyncStorage) que el resto de esta
// clase, ahora con 2 preferencias más.
export type NotesViewMode = 'list' | 'grid';
const NOTES_VIEW_STORAGE_KEY = 'notesViewMode';
const NOTES_VIEW_DEFAULT: NotesViewMode = 'list';

export type TasksViewMode = 'list' | 'calendar';
const TASKS_VIEW_STORAGE_KEY = 'tasksViewMode';
const TASKS_VIEW_DEFAULT: TasksViewMode = 'list';

interface PreferencesContextValue {
  confirmDestructiveActions: boolean;
  setConfirmDestructiveActions: (value: boolean) => void;
  timeFormat: TimeFormat;
  setTimeFormat: (value: TimeFormat) => void;
  notesViewMode: NotesViewMode;
  setNotesViewMode: (value: NotesViewMode) => void;
  tasksViewMode: TasksViewMode;
  setTasksViewMode: (value: TasksViewMode) => void;
}

const PreferencesCtx = createContext<PreferencesContextValue>({
  confirmDestructiveActions: CONFIRM_DEFAULT,
  setConfirmDestructiveActions: () => {},
  timeFormat: TIME_FORMAT_DEFAULT,
  setTimeFormat: () => {},
  notesViewMode: NOTES_VIEW_DEFAULT,
  setNotesViewMode: () => {},
  tasksViewMode: TASKS_VIEW_DEFAULT,
  setTasksViewMode: () => {},
});

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [confirmDestructiveActions, setConfirmState] = useState(CONFIRM_DEFAULT);
  const [timeFormat, setTimeFormatState] = useState<TimeFormat>(TIME_FORMAT_DEFAULT);
  const [notesViewMode, setNotesViewModeState] = useState<NotesViewMode>(NOTES_VIEW_DEFAULT);
  const [tasksViewMode, setTasksViewModeState] = useState<TasksViewMode>(TASKS_VIEW_DEFAULT);

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
    AsyncStorage.getItem(NOTES_VIEW_STORAGE_KEY).then((stored) => {
      if (stored === 'list' || stored === 'grid') {
        setNotesViewModeState(stored);
      }
    });
    AsyncStorage.getItem(TASKS_VIEW_STORAGE_KEY).then((stored) => {
      if (stored === 'list' || stored === 'calendar') {
        setTasksViewModeState(stored);
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

  function setNotesViewMode(value: NotesViewMode) {
    setNotesViewModeState(value);
    AsyncStorage.setItem(NOTES_VIEW_STORAGE_KEY, value);
  }

  function setTasksViewMode(value: TasksViewMode) {
    setTasksViewModeState(value);
    AsyncStorage.setItem(TASKS_VIEW_STORAGE_KEY, value);
  }

  const value = useMemo(
    () => ({
      confirmDestructiveActions,
      setConfirmDestructiveActions,
      timeFormat,
      setTimeFormat,
      notesViewMode,
      setNotesViewMode,
      tasksViewMode,
      setTasksViewMode,
    }),
    [confirmDestructiveActions, timeFormat, notesViewMode, tasksViewMode]
  );

  return <PreferencesCtx.Provider value={value}>{children}</PreferencesCtx.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  return useContext(PreferencesCtx);
}
