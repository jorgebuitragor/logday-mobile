import {
  applyEditorEdit, applyIncomingUpdate, applyTextEdit, docFromStateB64, encodeDocStateB64, getContentText,
} from '../lib/crdtText';
import * as contentSyncQueue from '../lib/contentSyncQueue';
import { withKeyLock } from '../lib/keyedLock';
import { deleteDailyEntryRemote, isPermanentSyncError, putDailyEntryContentRemote, SyncApiError, type SyncChange } from '../lib/syncApi';
import type { DailyEntryApiResponse } from '../lib/syncMapping';
import * as syncQueue from '../lib/syncQueue';
import type { RestoreResult } from '../lib/syncRestore';
import { getSyncRuntime } from '../lib/syncRuntime';
import type { DailyEntry } from '../types/dailyEntry';
import { getDb } from './index';

interface DailyEntryRow {
  date: string;
  content: string;
  updated_at: string;
  deleted_at: string | null;
}

function rowToDailyEntry(row: DailyEntryRow): DailyEntry {
  return {
    date: row.date,
    content: row.content,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export async function listDailyEntries(): Promise<DailyEntry[]> {
  const rows = await getDb().getAllAsync<DailyEntryRow>(
    "SELECT * FROM daily_entries WHERE deleted_at IS NULL AND content != '' ORDER BY date DESC"
  );
  return rows.map(rowToDailyEntry);
}

export async function getDailyEntry(date: string): Promise<DailyEntry | null> {
  const row = await getDb().getFirstAsync<DailyEntryRow>(
    'SELECT * FROM daily_entries WHERE date = ? AND deleted_at IS NULL',
    date
  );
  return row ? rowToDailyEntry(row) : null;
}

const dailyLock = (date: string) => `daily_entry:${date}`;

/** Upsert — mismo patrón que el servidor (`PUT /daily-entries/:date`, sin
 * POST separado). Solo se aplica lo que el usuario cambió desde `base` (lo
 * que el editor mostraba al cargar o al último guardado), mezclado sobre lo
 * que tenga SQLite ahora — puede traer actividades de otro cliente que el
 * editor todavía no tiene. Antes se diffeaba el texto completo del editor
 * contra el `Y.Text` y eso borraba lo remoto. Mismo arreglo que
 * `saveDailyEntry`/`applyDailyEditorEdit` en desktop. Devuelve el texto ya
 * mezclado. */
export function upsertDailyEntry(date: string, content: string, base: string): Promise<string> {
  return withKeyLock(dailyLock(date), async () => {
    const current = await getDailyEntry(date);
    const currentContent = current?.content ?? '';
    if (content === base) return currentContent;
    const stateB64 = await getDailyContentStateB64(date);
    const doc = docFromStateB64(stateB64);
    // Día sin estado CRDT todavía (anterior al sync, o nuevo): se siembra
    // con lo que tenga SQLite, como hace desktop.
    if (!stateB64 && currentContent) applyTextEdit(doc, currentContent);
    applyEditorEdit(doc, base, content);
    const merged = getContentText(doc);
    const nextStateB64 = encodeDocStateB64(doc);
    doc.destroy();
    const now = new Date().toISOString();
    await getDb().runAsync(
      `INSERT INTO daily_entries (date, content, content_state, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, NULL)
       ON CONFLICT(date) DO UPDATE SET content = excluded.content, content_state = excluded.content_state, updated_at = excluded.updated_at, deleted_at = NULL`,
      date,
      merged,
      nextStateB64,
      now
    );
    if (merged !== currentContent || !stateB64) void pushDailyContent(date, nextStateB64);
    return merged;
  });
}

export async function softDeleteDailyEntry(date: string): Promise<void> {
  const now = new Date().toISOString();
  // Bajo el candado de la entidad, igual que `apply*Response`: si no, una
  // respuesta que leyó la fila antes de este UPDATE la reescribía viva.
  await withKeyLock(dailyLock(date), () => getDb().runAsync('UPDATE daily_entries SET deleted_at = ? WHERE date = ?', now, date));
  void syncDeleteDailyEntry(date);
}

// Puerto de `deleteDailyMonth` de desktop (`appStore.ts`) — borra el
// directorio del mes completo. Igual que desktop (confirmado leyendo
// esa función): NO sincroniza nada, es una operación puramente local
// — mismo comportamiento (también sin sync) se replica acá, no es un
// corte de alcance de mobile.
// Devuelve las fechas que borró, para el "Deshacer" (specs/papelera/).
export async function softDeleteDailyMonth(yearMonth: string): Promise<string[]> {
  const now = new Date().toISOString();
  const rows = await getDb().getAllAsync<{ date: string }>(
    'SELECT date FROM daily_entries WHERE date LIKE ? AND deleted_at IS NULL',
    `${yearMonth}-%`
  );
  await getDb().runAsync(
    "UPDATE daily_entries SET deleted_at = ? WHERE date LIKE ? AND deleted_at IS NULL",
    now,
    `${yearMonth}-%`
  );
  return rows.map((r) => r.date);
}

// ── Sync (logday-server) — contenido (CRDT) ───────────────────────
// Mismo patrón que en db/notes.ts (ver el comentario ahí para el
// motivo de ubicación) — DailyEntry no tiene metadata aparte del
// contenido (PUT-only, sin create/patch de campos LWW).

async function getDailyContentStateB64(date: string): Promise<string | null> {
  const row = await getDb().getFirstAsync<{ content_state: string | null }>(
    'SELECT content_state FROM daily_entries WHERE date = ?',
    date
  );
  return row?.content_state ?? null;
}

async function pushDailyContent(date: string, stateB64: string): Promise<void> {
  const runtime = getSyncRuntime();
  if (!runtime?.enabled) return;
  if (!runtime.connected) {
    await contentSyncQueue.enqueue('daily_entry', date, stateB64);
    return;
  }
  try {
    const response = await runtime.withSyncAuth((token) => putDailyEntryContentRemote(runtime.serverUrl, token, date, stateB64));
    if (response.content_state) {
      const contentState = response.content_state;
      await withKeyLock(dailyLock(date), () => applyRemoteDailyContentState(date, contentState));
    }
  } catch (e) {
    // Un 4xx no se arregla reintentando: en la cola quedaba trabado para
    // siempre y frenaba el drenado del resto del contenido.
    if (isPermanentSyncError(e)) {
      console.warn('[sync] contenido descartado', 'daily_entry', date, (e as SyncApiError).status);
      return;
    }
    await contentSyncQueue.enqueue('daily_entry', date, stateB64);
  }
}

async function syncDeleteDailyEntry(date: string): Promise<void> {
  const runtime = getSyncRuntime();
  if (!runtime?.enabled) return;
  if (!runtime.connected) {
    await syncQueue.enqueue('daily_entry', date, 'delete');
    return;
  }
  try {
    await runtime.withSyncAuth((token) => deleteDailyEntryRemote(runtime.serverUrl, token, date));
  } catch (e) {
    if (e instanceof SyncApiError && e.status === 404) return;
    await syncQueue.enqueue('daily_entry', date, 'delete');
  }
}

async function applyRemoteDailyContentState(date: string, contentStateB64: string): Promise<void> {
  const current = await getDailyEntry(date);
  const stateB64 = await getDailyContentStateB64(date);
  const doc = docFromStateB64(stateB64);
  applyIncomingUpdate(doc, contentStateB64);
  const nextStateB64 = encodeDocStateB64(doc);
  const content = getContentText(doc);
  doc.destroy();
  const now = new Date().toISOString();
  // Sin `deleted_at = NULL` en el UPDATE: esto también aplica la respuesta
  // de un envío propio, y un daily borrado mientras viajaba no tiene que
  // revivir. El pull ya revive la fila antes de llamar aquí
  // (`applyRemoteDailyEntryChangeLocked`).
  await getDb().runAsync(
    `INSERT INTO daily_entries (date, content, content_state, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, NULL)
     ON CONFLICT(date) DO UPDATE SET content = excluded.content, content_state = excluded.content_state, updated_at = excluded.updated_at`,
    date,
    content,
    nextStateB64,
    current?.updatedAt ?? now
  );
}

// ── Subida inicial (Fase 4 del sync, `src/lib/syncInitialUpload.ts`) ──

/** Siembra el estado CRDT de los dailys con texto que nunca lo tuvieron
 *  (anteriores a la Fase 3 del sync). Además de dar operaciones que
 *  subir, evita perder texto: `applyRemoteDailyEntryChangeLocked` pisa
 *  `content` con el del servidor y, sin estado local, el merge CRDT no
 *  tiene nada local que conservar. */
export async function seedMissingDailyContentStates(): Promise<void> {
  const rows = await getDb().getAllAsync<{ date: string }>(
    "SELECT date FROM daily_entries WHERE content_state IS NULL AND content != ''"
  );
  for (const { date } of rows) {
    await withKeyLock(dailyLock(date), async () => {
      if (await getDailyContentStateB64(date)) return;
      const row = await getDb().getFirstAsync<{ content: string }>('SELECT content FROM daily_entries WHERE date = ?', date);
      if (!row?.content) return;
      const doc = docFromStateB64(null);
      applyTextEdit(doc, row.content);
      await getDb().runAsync('UPDATE daily_entries SET content_state = ? WHERE date = ?', encodeDocStateB64(doc), date);
      doc.destroy();
    });
  }
}

/** Sube el contenido de un daily local. Si el servidor ya tenía ese día,
 *  el pull de la subida inicial ya mezcló su estado con el local, así que
 *  esto solo agrega lo escrito en el teléfono. */
export async function uploadLocalDailyEntry(date: string): Promise<void> {
  const entry = await getDailyEntry(date);
  if (!entry) return;
  const stateB64 = await getDailyContentStateB64(date);
  if (stateB64) await pushDailyContent(date, stateB64);
}

// ── Pull (/sync/changes) ──────────────────────────────────────────

export function applyRemoteDailyEntryChange(change: SyncChange): Promise<void> {
  return withKeyLock(dailyLock(change.id), () => applyRemoteDailyEntryChangeLocked(change));
}

async function applyRemoteDailyEntryChangeLocked(change: SyncChange): Promise<void> {
  if (change.deleted) {
    await getDb().runAsync('UPDATE daily_entries SET deleted_at = ? WHERE date = ?', change.updated_at, change.id);
    return;
  }
  const data = change.data as DailyEntryApiResponse;
  const date = change.id;
  const now = change.updated_at;
  // `content`: valor base — si viene `content_state` (caso normal), el
  // merge CRDT de abajo lo pisa con el resultado ya fusionado; este
  // INSERT/UPDATE es tanto la creación de la fila si no existía como
  // el fallback para el caso raro sin `content_state`.
  await getDb().runAsync(
    `INSERT INTO daily_entries (date, content, updated_at, deleted_at)
     VALUES (?, ?, ?, NULL)
     ON CONFLICT(date) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at, deleted_at = NULL`,
    date,
    data.content ?? '',
    now
  );
  if (data.content_state) await applyRemoteDailyContentState(date, data.content_state);
}

// ── Papelera (specs/papelera/) ─────────────────────────────────────

/** Saca un daily de la papelera. DailyEntry no tiene create ni metadata:
 *  el único modo de revivirlo en el servidor es el `PUT` de contenido, que
 *  mezcla el update con el CRDT guardado (el borrado no lo toca) y limpia
 *  `deleted_at`.
 *
 *  Se manda el estado CRDT local entero, no un update vacío como Web. Es
 *  el mismo documento que el servidor ya conoce (mismas operaciones, no
 *  uno nuevo sembrado desde el texto, que es lo que duplicaba el texto en
 *  Web), así que la mezcla no duplica nada. Y la cola de contenido guarda
 *  un estado por día que **reemplaza** al anterior: encolar un update
 *  vacío borraría lo escrito sin conexión antes del borrado. Solo un daily
 *  sin estado CRDT (anterior a la Fase 3) manda el update vacío. */
export async function restoreDailyEntry(date: string): Promise<RestoreResult> {
  const stateB64 = await withKeyLock(dailyLock(date), async () => {
    const row = await getDb().getFirstAsync<{ deleted_at: string | null; content_state: string | null }>(
      'SELECT deleted_at, content_state FROM daily_entries WHERE date = ?',
      date
    );
    if (!row?.deleted_at) return undefined;
    await getDb().runAsync('UPDATE daily_entries SET deleted_at = NULL, updated_at = ? WHERE date = ?', new Date().toISOString(), date);
    return row.content_state;
  });
  if (stateB64 === undefined) return { restored: false, synced: Promise.resolve() };
  const synced = (async () => {
    if (!getSyncRuntime()?.enabled) return;
    await syncQueue.cancelPendingDeletes('daily_entry', date);
    if (stateB64) {
      await pushDailyContent(date, stateB64);
    } else if (!(await contentSyncQueue.hasPending('daily_entry', date))) {
      await pushDailyContent(date, encodeDocStateB64(docFromStateB64(null)));
    }
  })();
  return { restored: true, synced };
}
