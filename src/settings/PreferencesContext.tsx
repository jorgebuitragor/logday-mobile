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

// 'kanban' agregado 2026-08-30 — ver specs/vistas-tasks/.
export type TasksViewMode = 'list' | 'calendar' | 'kanban';
const TASKS_VIEW_STORAGE_KEY = 'tasksViewMode';
const TASKS_VIEW_DEFAULT: TasksViewMode = 'list';

// Mismos 3 criterios que el dropdown de ordenar de NoteList.tsx en
// desktop (sortBy, sin sortDir — desktop también expone dirección
// asc/desc, pero acá se deja fuera a propósito: alcance reducido
// pedido explícito por el usuario, "solo el selector de ordenes").
// pinned siempre flota primero sin importar el criterio, igual que
// desktop — ver el sort en `app/(tabs)/notes.tsx`.
export type NotesSortBy = 'updated' | 'created' | 'title';
const NOTES_SORT_STORAGE_KEY = 'notesSortBy';
const NOTES_SORT_DEFAULT: NotesSortBy = 'updated';

interface PreferencesContextValue {
  confirmDestructiveActions: boolean;
  setConfirmDestructiveActions: (value: boolean) => void;
  timeFormat: TimeFormat;
  setTimeFormat: (value: TimeFormat) => void;
  notesViewMode: NotesViewMode;
  setNotesViewMode: (value: NotesViewMode) => void;
  tasksViewMode: TasksViewMode;
  setTasksViewMode: (value: TasksViewMode) => void;
  notesSortBy: NotesSortBy;
  setNotesSortBy: (value: NotesSortBy) => void;
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
  notesSortBy: NOTES_SORT_DEFAULT,
  setNotesSortBy: () => {},
});

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [confirmDestructiveActions, setConfirmState] = useState(CONFIRM_DEFAULT);
  const [timeFormat, setTimeFormatState] = useState<TimeFormat>(TIME_FORMAT_DEFAULT);
  const [notesViewMode, setNotesViewModeState] = useState<NotesViewMode>(NOTES_VIEW_DEFAULT);
  const [tasksViewMode, setTasksViewModeState] = useState<TasksViewMode>(TASKS_VIEW_DEFAULT);
  const [notesSortBy, setNotesSortByState] = useState<NotesSortBy>(NOTES_SORT_DEFAULT);

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
      if (stored === 'list' || stored === 'calendar' || stored === 'kanban') {
        setTasksViewModeState(stored);
      }
    });
    AsyncStorage.getItem(NOTES_SORT_STORAGE_KEY).then((stored) => {
      if (stored === 'updated' || stored === 'created' || stored === 'title') {
        setNotesSortByState(stored);
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

  function setNotesSortBy(value: NotesSortBy) {
    setNotesSortByState(value);
    AsyncStorage.setItem(NOTES_SORT_STORAGE_KEY, value);
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
      notesSortBy,
      setNotesSortBy,
    }),
    [confirmDestructiveActions, timeFormat, notesViewMode, tasksViewMode, notesSortBy]
  );

  return <PreferencesCtx.Provider value={value}>{children}</PreferencesCtx.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  return useContext(PreferencesCtx);
}
