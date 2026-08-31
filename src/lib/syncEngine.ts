import AsyncStorage from '@react-native-async-storage/async-storage';

import { applyRemoteAbsenceDayChange } from '../db/absences';
import { applyRemoteOvertimeEntryChange, applyRemoteOvertimeMonthMetaChange } from '../db/overtime';
import { applyRemoteTaskChange } from '../db/tasks';
import {
  createAbsenceDayRemote, createOvertimeEntryRemote, createTaskRemote,
  deleteAbsenceDayRemote, deleteOvertimeEntryRemote, deleteTaskRemote,
  patchAbsenceDayRemote, patchOvertimeEntryRemote, patchOvertimeMonthMetaRemote, patchTaskRemote,
  syncChangesRemote, SyncApiError, type SyncChange, type SyncEntityType,
} from './syncApi';
import type {
  AbsenceDayCreatePayload, AbsenceDayPatchPayload,
  OvertimeEntryCreatePayload, OvertimeEntryPatchPayload, OvertimeMonthMetaPatchPayload,
  TaskCreatePayload, TaskPatchPayload,
} from './syncMapping';
import * as syncQueue from './syncQueue';
import { getSyncRuntime } from './syncRuntime';

// Orquestador de sync — pull (`reconcileSync`) + drenado de la cola
// offline (`drainSyncQueue`) + el polling que reemplaza el WebSocket
// en tiempo real que desktop tampoco tiene todavía (ver
// specs/sync-mobile/design.md, "por qué portar desktop"). El apply de
// cada cambio remoto vive en cada `src/db/*.ts` (no acá) para evitar
// un ciclo de import — ver el comentario en `db/tasks.ts`.

const CURSOR_STORAGE_KEY = 'syncCursor';
const PAGE_LIMIT = 500;

async function getCursor(): Promise<number> {
  return Number((await AsyncStorage.getItem(CURSOR_STORAGE_KEY)) || '0');
}

async function setCursor(seq: number): Promise<void> {
  await AsyncStorage.setItem(CURSOR_STORAGE_KEY, String(seq));
}

const APPLY_BY_TYPE: Partial<Record<SyncEntityType, (change: SyncChange) => Promise<void>>> = {
  task: applyRemoteTaskChange,
  overtime_entry: applyRemoteOvertimeEntryChange,
  overtime_month_meta: applyRemoteOvertimeMonthMetaChange,
  absence_day: applyRemoteAbsenceDayChange,
};

async function applyRemoteChanges(changes: SyncChange[]): Promise<void> {
  for (const change of changes) {
    const apply = APPLY_BY_TYPE[change.type];
    if (apply) await apply(change);
  }
}

// Trae TODO el delta desde `sinceStart`, paginando en loop — usado
// tanto por el camino normal (desde el cursor guardado) como por el
// fallback de cursor inválido (since=0) de `reconcileSync`.
async function fetchAllChanges(sinceStart: number): Promise<{ changes: SyncChange[]; maxSeq: number }> {
  const runtime = getSyncRuntime();
  if (!runtime) return { changes: [], maxSeq: sinceStart };
  const all: SyncChange[] = [];
  let since = sinceStart;
  let pageLen = PAGE_LIMIT;
  while (pageLen === PAGE_LIMIT) {
    const page = await runtime.withSyncAuth((token) => syncChangesRemote(runtime.serverUrl, token, since, PAGE_LIMIT));
    pageLen = page.length;
    if (page.length === 0) break;
    all.push(...page);
    since = page.reduce((m, c) => Math.max(m, c.seq), since);
  }
  return { changes: all, maxSeq: since };
}

/** Pull incremental desde el cursor guardado; si el servidor dice que
 * el cursor ya no es válido (410 — se purgaron tombstones más viejos
 * de lo que este cliente conoce), descarta el cursor y hace un full
 * resync desde cero — igual que `reconcileSync` en `appStore.ts` de
 * desktop. */
export async function reconcileSync(): Promise<void> {
  const runtime = getSyncRuntime();
  if (!runtime?.enabled || !runtime.connected) return;
  const cursor = await getCursor();
  try {
    const { changes, maxSeq } = await fetchAllChanges(cursor);
    await applyRemoteChanges(changes);
    if (changes.length > 0) await setCursor(maxSeq);
  } catch (e) {
    if (e instanceof SyncApiError && e.status === 410) {
      const { changes, maxSeq } = await fetchAllChanges(0);
      await applyRemoteChanges(changes);
      await setCursor(maxSeq);
    }
    // Otros errores (red caída, etc.): se reintenta solo en el
    // próximo tick del polling — no hay nada más que hacer acá sin
    // bloquear la UI.
  }
}

/** Reenvía una escritura que quedó en cola — mismo despacho por
 * entidad+operación que `dispatchQueuedWrite` en `appStore.ts` de
 * desktop, recortado a las 4 entidades de la Fase 2. */
async function dispatchQueuedWrite(write: syncQueue.QueuedWrite): Promise<void> {
  const runtime = getSyncRuntime();
  if (!runtime) throw new Error('sync not connected');
  const { serverUrl, withSyncAuth } = runtime;

  if (write.entity === 'task') {
    if (write.op === 'create') {
      await withSyncAuth((token) => createTaskRemote(serverUrl, token, write.fields as unknown as TaskCreatePayload));
    } else if (write.op === 'patch') {
      await withSyncAuth((token) => patchTaskRemote(serverUrl, token, write.entityId, write.fields as unknown as TaskPatchPayload));
    } else {
      await withSyncAuth((token) => deleteTaskRemote(serverUrl, token, write.entityId));
    }
    return;
  }
  if (write.entity === 'overtime_entry') {
    if (write.op === 'create') {
      await withSyncAuth((token) => createOvertimeEntryRemote(serverUrl, token, write.fields as unknown as OvertimeEntryCreatePayload));
    } else if (write.op === 'patch') {
      await withSyncAuth((token) => patchOvertimeEntryRemote(serverUrl, token, write.entityId, write.fields as unknown as OvertimeEntryPatchPayload));
    } else {
      await withSyncAuth((token) => deleteOvertimeEntryRemote(serverUrl, token, write.entityId));
    }
    return;
  }
  if (write.entity === 'overtime_month_meta') {
    // Sin create (PATCH crea-si-no-existe) ni delete (no hay acción
    // local que borre la meta de un mes).
    if (write.op === 'patch') {
      await withSyncAuth((token) => patchOvertimeMonthMetaRemote(serverUrl, token, write.entityId, write.fields as unknown as OvertimeMonthMetaPatchPayload));
    }
    return;
  }
  if (write.entity === 'absence_day') {
    if (write.op === 'create') {
      await withSyncAuth((token) => createAbsenceDayRemote(serverUrl, token, write.fields as unknown as AbsenceDayCreatePayload));
    } else if (write.op === 'patch') {
      await withSyncAuth((token) => patchAbsenceDayRemote(serverUrl, token, write.entityId, write.fields as unknown as AbsenceDayPatchPayload));
    } else {
      await withSyncAuth((token) => deleteAbsenceDayRemote(serverUrl, token, write.entityId));
    }
  }
}

/** Un 4xx nunca se va a arreglar solo reintentando el mismo payload
 * (a diferencia de una caída de red o un 5xx) — sin esto, una sola
 * entrada mal formada bloquearía el resto de la cola para siempre
 * (ver `syncQueue.drainQueue`). */
async function sendQueuedWrite(write: syncQueue.QueuedWrite): Promise<'ok' | 'permanent-failure'> {
  try {
    await dispatchQueuedWrite(write);
    return 'ok';
  } catch (e) {
    if (e instanceof SyncApiError && e.status >= 400 && e.status < 500) return 'permanent-failure';
    throw e;
  }
}

export async function drainSyncQueue(): Promise<void> {
  const runtime = getSyncRuntime();
  if (!runtime?.enabled || !runtime.connected) return;
  await syncQueue.drainQueue(sendQueuedWrite);
}

// ── Polling (reemplaza el WebSocket en tiempo real que desktop
// tampoco tiene todavía) ──
// Cada tick drena la cola local antes de reconciliar — no solo al
// conectar, mismo motivo que en desktop: sin esto una entrada
// quedaría en cola para siempre aunque la app siga "Conectado", ya
// que nada más la reintenta hasta la próxima reconexión manual.
const POLL_INTERVAL_MS = 30_000;
let pollIntervalId: ReturnType<typeof setInterval> | null = null;

export function startPolling(): void {
  if (pollIntervalId) return;
  pollIntervalId = setInterval(() => {
    void drainSyncQueue().then(() => reconcileSync());
  }, POLL_INTERVAL_MS);
}

export function stopPolling(): void {
  if (pollIntervalId) {
    clearInterval(pollIntervalId);
    pollIntervalId = null;
  }
}
