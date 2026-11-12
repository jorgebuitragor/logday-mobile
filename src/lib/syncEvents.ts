import type { SyncEntityType } from './syncApi';

// Aviso de "llegó un cambio remoto de esta entidad" para las pantallas que
// tienen una entidad abierta (editor de notas, editor de dailys). Las
// listas no lo necesitan: recargan al recuperar el foco. Los editores sí:
// sin esto, una edición de otro cliente no aparecía hasta reabrir, y el
// usuario seguía escribiendo sobre el texto viejo. Mismo papel que el
// store de desktop (`registerOpenNoteDoc`, `syncPanel`). Sin más
// dependencias a propósito, igual que `syncRuntime.ts`.

type RemoteChangeListener = (type: SyncEntityType, id: string) => void;

const listeners = new Set<RemoteChangeListener>();

export function onRemoteChange(listener: RemoteChangeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Lo llama `syncEngine` después de aplicar cada cambio del pull a SQLite. */
export function emitRemoteChange(type: SyncEntityType, id: string): void {
  for (const listener of listeners) listener(type, id);
}

// ── Fin de un pull y cambios locales de tareas ─────────────────────
// Los usa el resumen de vencimientos (src/lib/dueNotifications.ts) para
// reprogramarse después de cada sync y al cambiar una tarea aquí.

type Listener = () => void;

const pullListeners = new Set<Listener>();
const taskListeners = new Set<Listener>();

export function onPullFinished(listener: Listener): () => void {
  pullListeners.add(listener);
  return () => {
    pullListeners.delete(listener);
  };
}

export function emitPullFinished(): void {
  for (const listener of pullListeners) listener();
}

export function onLocalTaskChange(listener: Listener): () => void {
  taskListeners.add(listener);
  return () => {
    taskListeners.delete(listener);
  };
}

export function emitLocalTaskChange(): void {
  for (const listener of taskListeners) listener();
}
