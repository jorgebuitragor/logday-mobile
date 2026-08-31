import {
  applyIncomingUpdate, applyTextEdit, docFromStateB64, encodeDocStateB64, getContentText,
} from '../lib/crdtText';
import * as contentSyncQueue from '../lib/contentSyncQueue';
import { deleteDailyEntryRemote, putDailyEntryContentRemote, SyncApiError, type SyncChange } from '../lib/syncApi';
import type { DailyEntryApiResponse } from '../lib/syncMapping';
import * as syncQueue from '../lib/syncQueue';
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

/** Upsert — mismo patrón que el servidor (`PUT /daily-entries/:date`, sin POST separado). */
export async function upsertDailyEntry(date: string, content: string): Promise<void> {
  const now = new Date().toISOString();
  const current = await getDailyEntry(date);
  await getDb().runAsync(
    `INSERT INTO daily_entries (date, content, updated_at, deleted_at)
     VALUES (?, ?, ?, NULL)
     ON CONFLICT(date) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at, deleted_at = NULL`,
    date,
    content,
    now
  );
  if (!current || current.content !== content) {
    void pushDailyContent(date, content);
  }
}

export async function softDeleteDailyEntry(date: string): Promise<void> {
  const now = new Date().toISOString();
  await getDb().runAsync('UPDATE daily_entries SET deleted_at = ? WHERE date = ?', now, date);
  void syncDeleteDailyEntry(date);
}

// Puerto de `deleteDailyMonth` de desktop (`appStore.ts`) — borra el
// directorio del mes completo. Igual que desktop (confirmado leyendo
// esa función): NO sincroniza nada, es una operación puramente local
// — mismo comportamiento (también sin sync) se replica acá, no es un
// corte de alcance de mobile.
export async function softDeleteDailyMonth(yearMonth: string): Promise<void> {
  const now = new Date().toISOString();
  await getDb().runAsync(
    "UPDATE daily_entries SET deleted_at = ? WHERE date LIKE ? AND deleted_at IS NULL",
    now,
    `${yearMonth}-%`
  );
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

async function setDailyContentStateB64(date: string, stateB64: string): Promise<void> {
  await getDb().runAsync(
    `INSERT INTO daily_entries (date, content, content_state, updated_at, deleted_at)
     VALUES (?, '', ?, ?, NULL)
     ON CONFLICT(date) DO UPDATE SET content_state = excluded.content_state`,
    date,
    stateB64,
    new Date().toISOString()
  );
}

async function pushDailyContent(date: string, newContent: string): Promise<void> {
  const stateB64 = await getDailyContentStateB64(date);
  const doc = docFromStateB64(stateB64);
  applyTextEdit(doc, newContent);
  const nextStateB64 = encodeDocStateB64(doc);
  doc.destroy();
  await setDailyContentStateB64(date, nextStateB64);

  const runtime = getSyncRuntime();
  if (!runtime?.enabled) return;
  if (!runtime.connected) {
    await contentSyncQueue.enqueue('daily_entry', date, nextStateB64);
    return;
  }
  try {
    const response = await runtime.withSyncAuth((token) => putDailyEntryContentRemote(runtime.serverUrl, token, date, nextStateB64));
    if (response.content_state) await applyRemoteDailyContentState(date, response.content_state);
  } catch {
    await contentSyncQueue.enqueue('daily_entry', date, nextStateB64);
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
  await getDb().runAsync(
    `INSERT INTO daily_entries (date, content, content_state, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, NULL)
     ON CONFLICT(date) DO UPDATE SET content = excluded.content, content_state = excluded.content_state, updated_at = excluded.updated_at, deleted_at = NULL`,
    date,
    content,
    nextStateB64,
    current?.updatedAt ?? now
  );
}

// ── Pull (/sync/changes) ──────────────────────────────────────────

export async function applyRemoteDailyEntryChange(change: SyncChange): Promise<void> {
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
