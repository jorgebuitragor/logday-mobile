import AsyncStorage from '@react-native-async-storage/async-storage';

import { applyAbsenceDayResponse, applyRemoteAbsenceDayChange } from '../db/absences';
import { applyRemoteDailyEntryChange } from '../db/dailyEntries';
import { applyNoteResponse, applyRemoteNoteChange } from '../db/notes';
import { applyOvertimeEntryResponse, applyOvertimeMonthMetaResponse, applyRemoteOvertimeEntryChange, applyRemoteOvertimeMonthMetaChange } from '../db/overtime';
import { applyRemoteTaskChange, applyTaskResponse } from '../db/tasks';
import * as contentSyncQueue from './contentSyncQueue';
import {
  createAbsenceDayRemote, createNoteRemote, createOvertimeEntryRemote, createTaskRemote,
  deleteAbsenceDayRemote, deleteDailyEntryRemote, deleteNoteRemote, deleteOvertimeEntryRemote, deleteTaskRemote,
  patchAbsenceDayRemote, patchNoteRemote, patchOvertimeEntryRemote, patchOvertimeMonthMetaRemote, patchTaskRemote,
  putDailyEntryContentRemote, pushNoteContentRemote,
  syncChangesRemote, SyncApiError, type SyncChange, type SyncEntityType,
} from './syncApi';
import type {
  AbsenceDayCreatePayload, AbsenceDayPatchPayload,
  NoteCreatePayload, NotePatchPayload,
  OvertimeEntryCreatePayload, OvertimeEntryPatchPayload, OvertimeMonthMetaPatchPayload,
  TaskCreatePayload, TaskPatchPayload,
} from './syncMapping';
import * as syncQueue from './syncQueue';
import { getSyncRuntime } from './syncRuntime';

// Orquestador de sync — pull (`reconcileSync`) + drenado de las 2
// colas offline (`drainSyncQueue` para metadata LWW,
// `drainContentSyncQueue` para contenido CRDT) + el polling que
// reemplaza el WebSocket en tiempo real que desktop tampoco tiene
// todavía (ver specs/sync-mobile/design.md, "por qué portar
// desktop"). El apply de cada cambio remoto vive en cada
// `src/db/*.ts` (no acá) para evitar un ciclo de import — ver el
// comentario en `db/tasks.ts`.

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
  note: applyRemoteNoteChange,
  daily_entry: applyRemoteDailyEntryChange,
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
 * desktop. Un create/patch exitoso aplica la respuesta de vuelta
 * (mismo criterio de "cola gana sobre respuesta tardía" que el envío
 * directo) — sin esto, cualquier normalización o merge concurrente
 * que el servidor haya hecho quedaría sin reflejarse localmente tras
 * drenar. */
async function dispatchQueuedWrite(write: syncQueue.QueuedWrite): Promise<void> {
  const runtime = getSyncRuntime();
  if (!runtime) throw new Error('sync not connected');
  const { serverUrl, withSyncAuth } = runtime;

  if (write.entity === 'task') {
    if (write.op === 'create') {
      const r = await withSyncAuth((token) => createTaskRemote(serverUrl, token, write.fields as unknown as TaskCreatePayload));
      await applyTaskResponse(write.entityId, write.queuedAt, r);
    } else if (write.op === 'patch') {
      const r = await withSyncAuth((token) => patchTaskRemote(serverUrl, token, write.entityId, write.fields as unknown as TaskPatchPayload));
      await applyTaskResponse(write.entityId, write.queuedAt, r);
    } else {
      await withSyncAuth((token) => deleteTaskRemote(serverUrl, token, write.entityId));
    }
    return;
  }
  if (write.entity === 'overtime_entry') {
    if (write.op === 'create') {
      const r = await withSyncAuth((token) => createOvertimeEntryRemote(serverUrl, token, write.fields as unknown as OvertimeEntryCreatePayload));
      await applyOvertimeEntryResponse(write.entityId, write.queuedAt, r);
    } else if (write.op === 'patch') {
      const r = await withSyncAuth((token) => patchOvertimeEntryRemote(serverUrl, token, write.entityId, write.fields as unknown as OvertimeEntryPatchPayload));
      await applyOvertimeEntryResponse(write.entityId, write.queuedAt, r);
    } else {
      await withSyncAuth((token) => deleteOvertimeEntryRemote(serverUrl, token, write.entityId));
    }
    return;
  }
  if (write.entity === 'overtime_month_meta') {
    // Sin create (PATCH crea-si-no-existe) ni delete (no hay acción
    // local que borre la meta de un mes).
    if (write.op === 'patch') {
      const r = await withSyncAuth((token) => patchOvertimeMonthMetaRemote(serverUrl, token, write.entityId, write.fields as unknown as OvertimeMonthMetaPatchPayload));
      await applyOvertimeMonthMetaResponse(write.entityId, write.queuedAt, r);
    }
    return;
  }
  if (write.entity === 'absence_day') {
    if (write.op === 'create') {
      const r = await withSyncAuth((token) => createAbsenceDayRemote(serverUrl, token, write.fields as unknown as AbsenceDayCreatePayload));
      await applyAbsenceDayResponse(write.entityId, write.queuedAt, r);
    } else if (write.op === 'patch') {
      const r = await withSyncAuth((token) => patchAbsenceDayRemote(serverUrl, token, write.entityId, write.fields as unknown as AbsenceDayPatchPayload));
      await applyAbsenceDayResponse(write.entityId, write.queuedAt, r);
    } else {
      await withSyncAuth((token) => deleteAbsenceDayRemote(serverUrl, token, write.entityId));
    }
    return;
  }
  if (write.entity === 'note') {
    if (write.op === 'create') {
      const r = await withSyncAuth((token) => createNoteRemote(serverUrl, token, write.fields as unknown as NoteCreatePayload));
      await applyNoteResponse(write.entityId, write.queuedAt, r);
    } else if (write.op === 'patch') {
      const r = await withSyncAuth((token) => patchNoteRemote(serverUrl, token, write.entityId, write.fields as unknown as NotePatchPayload));
      await applyNoteResponse(write.entityId, write.queuedAt, r);
    } else {
      await withSyncAuth((token) => deleteNoteRemote(serverUrl, token, write.entityId));
    }
    return;
  }
  if (write.entity === 'daily_entry') {
    // Solo delete acá — el contenido va por contentSyncQueue (CRDT),
    // no por esta cola de create/patch/delete (DailyEntry no tiene
    // metadata LWW separada, ver db/dailyEntries.ts).
    if (write.op === 'delete') {
      await withSyncAuth((token) => deleteDailyEntryRemote(serverUrl, token, write.entityId));
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

/** Drena la cola de contenido CRDT (Note/DailyEntry) — despacho
 * separado de `drainSyncQueue` porque su cola es un mapa coalescente
 * por (entidad, key), no un FIFO (ver `contentSyncQueue.ts`). Aplica
 * la respuesta de vuelta igual que el envío directo (el servidor
 * puede devolver un `content_state` ya fusionado con ediciones
 * concurrentes de otro cliente). */
export async function drainContentSyncQueue(): Promise<void> {
  const runtime = getSyncRuntime();
  if (!runtime?.enabled || !runtime.connected) return;
  const { serverUrl, withSyncAuth } = runtime;
  await contentSyncQueue.drain(async (entity, key, updateB64) => {
    // "Ahora" (no el `queuedAt` original) — mismo criterio que
    // `drainContentSyncQueue` en desktop: protege cualquier edición
    // nueva hecha mientras este drenado estaba en curso, no la vieja
    // que se está drenando (que ya está reflejada en `updateB64`).
    const queuedAt = new Date().toISOString();
    if (entity === 'note') {
      const r = await withSyncAuth((token) => pushNoteContentRemote(serverUrl, token, key, updateB64));
      await applyNoteResponse(key, queuedAt, r);
    } else {
      await withSyncAuth((token) => putDailyEntryContentRemote(serverUrl, token, key, updateB64));
    }
  });
}

// ── Polling (reemplaza el WebSocket en tiempo real que desktop
// tampoco tiene todavía) ──
// Cada tick drena las 2 colas locales antes de reconciliar — no solo
// al conectar, mismo motivo que en desktop: sin esto una entrada
// quedaría en cola para siempre aunque la app siga "Conectado", ya
// que nada más la reintenta hasta la próxima reconexión manual.
const POLL_INTERVAL_MS = 30_000;
let pollIntervalId: ReturnType<typeof setInterval> | null = null;

export function startPolling(): void {
  if (pollIntervalId) return;
  pollIntervalId = setInterval(() => {
    void Promise.all([drainSyncQueue(), drainContentSyncQueue()]).then(() => reconcileSync());
  }, POLL_INTERVAL_MS);
}

export function stopPolling(): void {
  if (pollIntervalId) {
    clearInterval(pollIntervalId);
    pollIntervalId = null;
  }
}
