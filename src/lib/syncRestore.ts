import * as syncQueue from './syncQueue';
import { getSyncRuntime } from './syncRuntime';

// Cómo se restaura en el servidor algo que salió de la papelera
// (specs/papelera/). El borrado del servidor es blando: deja la fila con
// `deleted_at`, y un `create` con el mismo id la revive (`ON CONFLICT ...
// deleted_at = NULL`, ver logday-server `internal/*/store.go`). Mismo
// criterio que la papelera de Web (`restoreFromTrash` en logday-web):
//
// - el `create` revive la fila con los datos locales;
// - tareas y notas llevan además un `patch` con sus campos LWW, para que
//   cada campo quede sellado con la hora de la restauración y no con la
//   de una edición vieja (el `create` no toca `field_updated_at`);
// - el contenido CRDT de las notas nunca se reenvía: el servidor no lo
//   toca al borrar, y reenviarlo duplicaba el texto en Web.
//
// Antes de enviar se cancela el borrado si todavía estaba en la cola: si
// no, la cola lo mandaría después y volvería a borrar lo restaurado. Si
// quedan otras escrituras en cola para esa entidad, la restauración va
// detrás de ellas, en la cola, para no adelantarse.

interface RestoreSteps<C, P, R> {
  entity: syncQueue.EntityType;
  id: string;
  create: { payload: C; send: (serverUrl: string, token: string, payload: C) => Promise<R> };
  patch?: { payload: P; send: (serverUrl: string, token: string, id: string, payload: P) => Promise<R> };
  /** Aplica la respuesta del servidor a la fila local (`apply*Response`). */
  apply: (id: string, sinceIso: string, response: R) => Promise<void>;
}

export async function syncRestore<C, P, R>(steps: RestoreSteps<C, P, R>): Promise<void> {
  const runtime = getSyncRuntime();
  if (!runtime?.enabled) return;
  const { entity, id, create, patch, apply } = steps;
  await syncQueue.cancelPendingDeletes(entity, id);

  const enqueueCreate = () => syncQueue.enqueue(entity, id, 'create', create.payload as unknown as Record<string, unknown>);
  const enqueuePatch = async () => {
    if (patch) await syncQueue.enqueue(entity, id, 'patch', patch.payload as unknown as Record<string, unknown>);
  };

  if (!runtime.connected || (await syncQueue.hasPendingWrites(entity, id))) {
    await enqueueCreate();
    await enqueuePatch();
    return;
  }
  try {
    const sinceIso = new Date().toISOString();
    const response = await runtime.withSyncAuth((token) => create.send(runtime.serverUrl, token, create.payload));
    await apply(id, sinceIso, response);
  } catch {
    await enqueueCreate();
    await enqueuePatch();
    return;
  }
  if (!patch) return;
  try {
    const sinceIso = new Date().toISOString();
    const response = await runtime.withSyncAuth((token) => patch.send(runtime.serverUrl, token, id, patch.payload));
    await apply(id, sinceIso, response);
  } catch {
    await enqueuePatch();
  }
}

/** Resultado de restaurar desde la papelera (specs/papelera/): si se
 *  restauró aquí, y la promesa del envío al servidor, que la pantalla no
 *  espera y las pruebas sí. */
export interface RestoreResult {
  restored: boolean;
  synced: Promise<void>;
}
