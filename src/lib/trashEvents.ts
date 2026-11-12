import type { TrashEntity } from '../db/trash';

// Aviso de "Eliminado · Deshacer" (specs/papelera/). Las pantallas que
// borran llaman `announceTrashed`; `UndoToast`, montado una sola vez en el
// layout raíz, lo muestra. Vive fuera de React para que el aviso siga
// visible aunque la pantalla que borró se cierre (borrar desde el detalle
// vuelve atrás).

export interface TrashedItems {
  items: { entity: TrashEntity; key: string }[];
  /** Lo que se borró, para el texto del aviso (título, fecha). */
  label?: string;
}

type Listener = (trashed: TrashedItems) => void;

const listeners = new Set<Listener>();

export function onTrashed(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function announceTrashed(trashed: TrashedItems): void {
  if (trashed.items.length === 0) return;
  for (const listener of listeners) listener(trashed);
}
