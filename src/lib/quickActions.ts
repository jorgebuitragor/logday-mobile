import * as QuickActions from 'expo-quick-actions';
import { Platform } from 'react-native';

import { todayISO } from './dates';

// Atajos del ícono (specs/captura-rapida/): al mantener pulsado el ícono de
// Logday aparecen "Nueva tarea", "Nueva nota" y "Daily de hoy". Abren rutas
// que ya existen. Se manejan con un id y no con un `href` fijo porque "Daily
// de hoy" depende del día en que se toca.
//
// En Expo Go no hay módulo nativo: `expo-quick-actions` lo carga como
// opcional y todo queda sin efecto. Se prueba desde el build de la fase 2.

export type QuickActionId = 'new-task' | 'new-note' | 'daily-today';

/** La ruta de un atajo, o null si el id no es nuestro. */
export function quickActionHref(id: string, today: string = todayISO()): string | null {
  switch (id) {
    case 'new-task':
      return '/task/new';
    case 'new-note':
      return '/note/new';
    case 'daily-today':
      return `/daily/${today}`;
    default:
      return null;
  }
}

/** Ícono de cada atajo. En iOS, los del sistema. En Android, los recursos
 *  que genera el plugin de `expo-quick-actions` desde `androidIcons` de
 *  app.json (los glifos de Lucide del Inicio, en `assets/quick-actions/`):
 *  Android busca un recurso con ese nombre, y uno que no existe deja el
 *  atajo con un círculo vacío. */
export function quickActionIcon(id: QuickActionId, os: string = Platform.OS): string {
  const icons: Record<QuickActionId, { ios: string; android: string }> = {
    'new-task': { ios: 'task', android: 'shortcut_task' },
    'new-note': { ios: 'compose', android: 'shortcut_note' },
    'daily-today': { ios: 'date', android: 'shortcut_daily' },
  };
  return os === 'android' ? icons[id].android : icons[id].ios;
}

/** Registra los atajos con los textos del idioma actual. */
export async function registerQuickActions(t: (key: string) => string): Promise<void> {
  if (!(await QuickActions.isSupported())) return;
  await QuickActions.setItems([
    { id: 'new-task', title: t('quickActions.newTask'), icon: quickActionIcon('new-task') },
    { id: 'new-note', title: t('quickActions.newNote'), icon: quickActionIcon('new-note') },
    { id: 'daily-today', title: t('quickActions.dailyToday'), icon: quickActionIcon('daily-today') },
  ]);
}

let initialHandled = false;

/** Llama `open` con la ruta del atajo que abrió la app (una sola vez) y con
 *  los que se toquen mientras está abierta. */
export function listenQuickActions(open: (href: string) => void): () => void {
  if (!initialHandled && QuickActions.initial) {
    initialHandled = true;
    const href = quickActionHref(QuickActions.initial.id);
    if (href) open(href);
  }
  const sub = QuickActions.addListener((action) => {
    const href = quickActionHref(action.id);
    if (href) open(href);
  });
  return () => sub.remove();
}
