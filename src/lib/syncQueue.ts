import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';

// Cola de escrituras pendientes de mandar a logday-server — puerto de
// task-manager/src/lib/syncQueue.ts, `AsyncStorage` en vez de
// `localStorage`. Persistida, no en memoria: sobrevive a que la app se
// cierre con escrituras sin drenar.

export type EntityType = 'task' | 'overtime_entry' | 'overtime_month_meta' | 'absence_day' | 'note' | 'daily_entry';

// PATCH no crea-si-no-existe salvo overtime_month_meta (ver
// syncMapping.ts) — una entidad recién creada offline tiene que
// drenar como create (POST), no patch, o el servidor la rechaza con
// 404. delete no lleva fields.
export type WriteOp = 'create' | 'patch' | 'delete';

export interface QueuedWrite {
  id: string; // uuid de esta entrada, no el id de la entidad
  entity: EntityType;
  entityId: string; // id de la entidad, o year_month para overtime_month_meta
  op: WriteOp;
  fields: Record<string, unknown>; // payload completo (create) o parcial (patch), vacío para delete
  queuedAt: string; // rfc3339, cuándo se encoló (no cuándo se drena)
}

const STORAGE_KEY = 'syncQueue';

async function loadQueue(): Promise<QueuedWrite[]> {
  try {
    const parsed = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveQueue(queue: QueuedWrite[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export async function enqueue(
  entity: EntityType,
  entityId: string,
  op: WriteOp,
  fields: Record<string, unknown> = {}
): Promise<void> {
  const queue = await loadQueue();
  queue.push({ id: randomUUID(), entity, entityId, op, fields, queuedAt: new Date().toISOString() });
  await saveQueue(queue);
}

export async function queueLength(): Promise<number> {
  return (await loadQueue()).length;
}

async function dequeue(id: string, queue: QueuedWrite[]): Promise<QueuedWrite[]> {
  const next = queue.filter((w) => w.id !== id);
  await saveQueue(next);
  return next;
}

/**
 * ¿Hay una entrada en cola, más nueva que `sinceIso`, que también
 * toca ese mismo campo de esa misma entidad? Si sí, una respuesta/
 * cambio remoto tardío no debe pisar ese campo — la entrada en cola
 * es, por definición, la edición vigente del usuario.
 */
export async function hasNewerQueuedField(
  entity: EntityType,
  entityId: string,
  field: string,
  sinceIso: string
): Promise<boolean> {
  const queue = await loadQueue();
  return queue.some((w) => w.entity === entity && w.entityId === entityId && field in w.fields && w.queuedAt > sinceIso);
}

/**
 * Drena la cola en orden de `queuedAt`, un envío a la vez (no en
 * paralelo — evita reordenar escrituras al mismo campo por timing de
 * red). `send` puede devolver:
 * - `'ok'`: se sacó de la cola normalmente.
 * - `'permanent-failure'`: el servidor la rechazó de forma que
 *   reintentarla nunca va a funcionar — se saca igual, sin
 *   reintentar, para no bloquear el resto de la cola para siempre por
 *   una sola entrada irrecuperable.
 * - lanza una excepción: fallo transitorio (red caída, 5xx) — corta
 *   el drenado acá, las entradas restantes (esta incluida) quedan en
 *   cola en su orden original para el próximo intento.
 */
export async function drainQueue(send: (write: QueuedWrite) => Promise<'ok' | 'permanent-failure'>): Promise<void> {
  let queue = [...(await loadQueue())].sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
  for (const write of queue) {
    try {
      await send(write);
      queue = await dequeue(write.id, queue);
    } catch {
      break;
    }
  }
}
