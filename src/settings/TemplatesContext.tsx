import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { pickCustomOvertimeTemplate } from '../lib/templateFiles';
import type { DailyTemplateChoice, OvertimeTemplateSource, TemplatesConfig } from '../lib/templates/choice';

// Plantillas del mensaje del Daily y del Excel de horas extra
// (logday-server specs/plantillas, v1). Igual que el resto de la config no
// sensible, en AsyncStorage y solo en este teléfono: sin sync en la v1.
// Vacío (`{}`) es lo predeterminado en las dos salidas, así que quien nunca
// abre Ajustes → Plantillas sigue con lo de siempre.
export const TEMPLATES_STORAGE_KEY = 'templates';

/** Lo guardado, o `{}` si no hay nada o no se puede leer. */
export async function loadTemplatesConfig(): Promise<TemplatesConfig> {
  try {
    const raw = await AsyncStorage.getItem(TEMPLATES_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? (parsed as TemplatesConfig) : {};
  } catch {
    return {};
  }
}

interface TemplatesContextValue {
  templates: TemplatesConfig;
  setDailyTemplate: (choice: DailyTemplateChoice) => void;
  /** 'custom' solo si ya hay un archivo cargado. */
  setOvertimeTemplateSource: (source: OvertimeTemplateSource) => void;
  /** Elige un .xlsx, lo copia a la carpeta de la app y lo activa. `false`
   *  si el usuario canceló. Lanza si no se pudo copiar. */
  loadOvertimeTemplate: () => Promise<boolean>;
}

const TemplatesCtx = createContext<TemplatesContextValue>({
  templates: {},
  setDailyTemplate: () => {},
  setOvertimeTemplateSource: () => {},
  loadOvertimeTemplate: async () => false,
});

export function TemplatesProvider({ children }: { children: ReactNode }) {
  const [templates, setTemplates] = useState<TemplatesConfig>({});
  // Lo último que se escribió, para encadenar cambios seguidos sin
  // depender de que React ya haya renderizado el anterior.
  const current = useRef<TemplatesConfig>({});

  useEffect(() => {
    loadTemplatesConfig().then((stored) => {
      current.current = stored;
      setTemplates(stored);
    });
  }, []);

  const update = useCallback((next: (prev: TemplatesConfig) => TemplatesConfig) => {
    const value = next(current.current);
    current.current = value;
    setTemplates(value);
    void AsyncStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(value));
  }, []);

  const setDailyTemplate = useCallback(
    (choice: DailyTemplateChoice) => update((prev) => ({ ...prev, daily: { ...prev.daily, ...choice } })),
    [update]
  );

  const setOvertimeTemplateSource = useCallback(
    (source: OvertimeTemplateSource) =>
      update((prev) => {
        if (source === 'custom' && !prev.overtime?.fileName) return prev;
        return { ...prev, overtime: { ...prev.overtime, source } };
      }),
    [update]
  );

  const loadOvertimeTemplate = useCallback(async () => {
    const fileName = await pickCustomOvertimeTemplate();
    if (fileName === null) return false;
    update((prev) => ({
      ...prev,
      overtime: { source: 'custom', fileName, loadedAt: new Date().toISOString() },
    }));
    return true;
  }, [update]);

  const value = useMemo(
    () => ({ templates, setDailyTemplate, setOvertimeTemplateSource, loadOvertimeTemplate }),
    [templates, setDailyTemplate, setOvertimeTemplateSource, loadOvertimeTemplate]
  );

  return <TemplatesCtx.Provider value={value}>{children}</TemplatesCtx.Provider>;
}

export function useTemplates(): TemplatesContextValue {
  return useContext(TemplatesCtx);
}
