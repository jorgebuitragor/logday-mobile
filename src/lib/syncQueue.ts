import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';

import { withKeyLock } from './keyedLock';

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

// Toda lectura → cambio → escritura de la cola pasa por este candado.
// AsyncStorage es async: sin él, un `enqueue` que cae mientras el drenado
// quita una entrada se pierde (cada uno guarda su propia copia de la cola
// y la que escribe última borra lo que agregó la otra).
function withQueueLock<T>(fn: () => Promise<T>): Promise<T> {
  return withKeyLock(STORAGE_KEY, fn);
}

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
  await withQueueLock(async () => {
    const queue = await loadQueue();
    queue.push({ id: randomUUID(), entity, entityId, op, fields, queuedAt: new Date().toISOString() });
    await saveQueue(queue);
  });
}

export async function queueLength(): Promise<number> {
  return (await loadQueue()).length;
}

// Relee la cola guardada en vez de filtrar la copia con la que arrancó el
// drenado: esa copia no tiene lo que se encoló mientras tanto.
function dequeue(id: string): Promise<void> {
  return withQueueLock(async () => {
    const queue = await loadQueue();
    await saveQueue(queue.filter((w) => w.id !== id));
  });
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
 * - lanza una excepción: fallo transitorio (red caída, 5xx, sesión
 *   vencida) — corta el drenado acá, las entradas restantes (esta
 *   incluida) quedan en cola en su orden original para el próximo intento.
 *
 * Un solo drenado a la vez: si ya hay uno en curso (el polling, la vuelta
 * a primer plano y la reconexión pueden coincidir), se devuelve ese mismo.
 * Dos en paralelo mandarían dos veces las mismas escrituras. Lo encolado
 * mientras tanto se manda en el próximo drenado.
 */
let draining: Promise<void> | null = null;

export function drainQueue(send: (write: QueuedWrite) => Promise<'ok' | 'permanent-failure'>): Promise<void> {
  if (!draining) {
    draining = drainOnce(send).finally(() => {
      draining = null;
    });
  }
  return draining;
}

async function drainOnce(send: (write: QueuedWrite) => Promise<'ok' | 'permanent-failure'>): Promise<void> {
  const queue = [...(await loadQueue())].sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
  for (const write of queue) {
    try {
      await send(write);
    } catch {
      break;
    }
    await dequeue(write.id);
  }
}
