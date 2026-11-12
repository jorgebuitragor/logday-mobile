import * as QuickActions from 'expo-quick-actions';

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

/** Registra los atajos con los textos del idioma actual. Los íconos son los
 *  del sistema en iOS; en Android van sin ícono propio por ahora. */
export async function registerQuickActions(t: (key: string) => string): Promise<void> {
  if (!(await QuickActions.isSupported())) return;
  await QuickActions.setItems([
    { id: 'new-task', title: t('quickActions.newTask'), icon: 'task' },
    { id: 'new-note', title: t('quickActions.newNote'), icon: 'compose' },
    { id: 'daily-today', title: t('quickActions.dailyToday'), icon: 'date' },
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
