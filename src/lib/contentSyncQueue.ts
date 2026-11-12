import AsyncStorage from '@react-native-async-storage/async-storage';

import { withKeyLock } from './keyedLock';

// Cola de contenido CRDT (Yjs) pendiente de mandar a logday-server —
// puerto de task-manager/src/lib/contentSyncQueue.ts, `AsyncStorage`
// en vez de `localStorage`. NO es un array FIFO como `syncQueue.ts`:
// es un mapa por (entidad, key). Cada guardado nuevo pisa la entrada
// anterior de la misma entidad — el estado Yjs ya viaja completo y
// acumulativo (ver `crdtText.ts`), no hace falta reenviar historial,
// así que coalescer sale gratis. `syncQueue.ts` no encaja acá: su
// semántica de "cola gana sobre respuesta tardía" (hasNewerQueuedField)
// resuelve un problema de LWW por campo que Yjs no tiene (merge
// conmutativo).
//
// Entidad + key en vez de solo key: sirve a Note (key = uuid) y
// DailyEntry (key = fecha YYYY-MM-DD) — formatos distintos que no
// colisionan en la práctica, pero separar por entidad evita depender
// de eso a futuro.

export type ContentEntity = 'note' | 'daily_entry';

export interface QueuedContent {
  updateB64: string;
  queuedAt: string; // rfc3339
}

const STORAGE_KEY = 'contentSyncQueue';

// Mismo motivo que en `syncQueue.ts`: serializa lectura → cambio →
// escritura para que un `enqueue` no se pierda contra el drenado.
function withQueueLock<T>(fn: () => Promise<T>): Promise<T> {
  return withKeyLock(STORAGE_KEY, fn);
}

function storageKey(entity: ContentEntity, key: string): string {
  return `${entity}:${key}`;
}

async function loadQueue(): Promise<Record<string, QueuedContent>> {
  try {
    const parsed = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function saveQueue(queue: Record<string, QueuedContent>): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export async function enqueue(entity: ContentEntity, key: string, updateB64: string): Promise<void> {
  await withQueueLock(async () => {
    const queue = await loadQueue();
    queue[storageKey(entity, key)] = { updateB64, queuedAt: new Date().toISOString() };
    await saveQueue(queue);
  });
}

export async function hasPending(entity: ContentEntity, key: string): Promise<boolean> {
  return storageKey(entity, key) in (await loadQueue());
}

export async function queueLength(): Promise<number> {
  return Object.keys(await loadQueue()).length;
}

/**
 * Drena la cola en orden de `queuedAt`, una entrada a la vez. Mismo
 * contrato que `syncQueue.drainQueue`: si `send` lanza (fallo
 * transitorio — red caída, 5xx, sesión vencida), corta el drenado ahí;
 * las entradas restantes quedan en cola para el próximo intento.
 *
 * Tras un envío exitoso solo se quita la entrada si sigue siendo la misma
 * que se mandó. Si mientras viajaba se guardó un estado más nuevo de la
 * misma nota o daily, ese reemplazó a la entrada y tiene que quedarse para
 * el próximo drenado. También aquí hay un solo drenado a la vez.
 */
let draining: Promise<void> | null = null;

export function drain(send: (entity: ContentEntity, key: string, updateB64: string) => Promise<void>): Promise<void> {
  if (!draining) {
    draining = drainOnce(send).finally(() => {
      draining = null;
    });
  }
  return draining;
}

async function drainOnce(send: (entity: ContentEntity, key: string, updateB64: string) => Promise<void>): Promise<void> {
  const queue = await loadQueue();
  const entries = Object.entries(queue).sort((a, b) => a[1].queuedAt.localeCompare(b[1].queuedAt));
  for (const [storageKeyStr, entry] of entries) {
    const sepIdx = storageKeyStr.indexOf(':');
    if (sepIdx === -1) continue; // formato inesperado, se descarta
    const entity = storageKeyStr.slice(0, sepIdx) as ContentEntity;
    const key = storageKeyStr.slice(sepIdx + 1);
    try {
      await send(entity, key, entry.updateB64);
    } catch {
      break;
    }
    await withQueueLock(async () => {
      const fresh = await loadQueue();
      const current = fresh[storageKeyStr];
      if (current && current.queuedAt === entry.queuedAt && current.updateB64 === entry.updateB64) {
        delete fresh[storageKeyStr];
        await saveQueue(fresh);
      }
    });
  }
}
