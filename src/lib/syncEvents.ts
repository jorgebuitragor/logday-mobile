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
