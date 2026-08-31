import { randomUUID } from 'expo-crypto';

import {
  applyIncomingUpdate, applyTextEdit, docFromStateB64, encodeDocStateB64, getContentText,
} from '../lib/crdtText';
import * as contentSyncQueue from '../lib/contentSyncQueue';
import { diffChangedFields } from '../lib/objectDiff';
import {
  createNoteRemote, deleteNoteRemote, patchNoteRemote, pushNoteContentRemote,
  SyncApiError, type SyncChange,
} from '../lib/syncApi';
import { noteFieldsToPatchPayload, noteFromApiResponse, noteToCreatePayload, NOTE_FIELD_MAP, type NoteApiResponse } from '../lib/syncMapping';
import * as syncQueue from '../lib/syncQueue';
import { getSyncRuntime } from '../lib/syncRuntime';
import type { Note } from '../types/note';
import { getDb } from './index';

interface NoteRow {
  id: string;
  title: string;
  folder: string;
  tags: string;
  created: string;
  updated: string;
  pinned: number;
  content: string;
  updated_at: string;
  deleted_at: string | null;
}

function rowToNote(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    folder: row.folder,
    tags: JSON.parse(row.tags) as string[],
    created: row.created,
    updated: row.updated,
    pinned: row.pinned === 1,
    content: row.content,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

// pinned primero (igual que NoteList.tsx de desktop: `a.pinned !== b.pinned
// ? (a.pinned ? -1 : 1) : ...`), luego por `updated` descendente dentro de
// cada grupo — ver "Listado" en requirements.md.
export async function listNotes(): Promise<Note[]> {
  const rows = await getDb().getAllAsync<NoteRow>(
    'SELECT * FROM notes WHERE deleted_at IS NULL ORDER BY pinned DESC, updated DESC'
  );
  return rows.map(rowToNote);
}

export async function getNote(id: string): Promise<Note | null> {
  const row = await getDb().getFirstAsync<NoteRow>('SELECT * FROM notes WHERE id = ?', id);
  return row ? rowToNote(row) : null;
}

export interface NoteInput {
  title: string;
  content: string;
  folder: string;
  tags: string[];
}

export async function createNote(input: NoteInput): Promise<string> {
  const id = randomUUID();
  const now = new Date().toISOString();
  await getDb().runAsync(
    `INSERT INTO notes (id, title, folder, tags, created, updated, pinned, content, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, NULL)`,
    id,
    input.title,
    input.folder,
    JSON.stringify(input.tags),
    now,
    now,
    input.content,
    now
  );
  // Sin push de contenido acá — una nota recién creada siempre arranca
  // vacía (ver `note/new.tsx`), el primer `updateNote` real (cuando el
  // usuario escribe algo) es quien dispara el primer push CRDT. Evita
  // un round-trip de un Y.Doc vacío sin ningún propósito.
  void syncCreateNote({
    id, title: input.title, folder: input.folder, tags: input.tags,
    created: now, updated: now, pinned: false, content: input.content,
    updatedAt: now, deletedAt: null,
  });
  return id;
}

export async function updateNote(id: string, input: NoteInput): Promise<void> {
  const now = new Date().toISOString();
  const current = await getNote(id);
  await getDb().runAsync(
    `UPDATE notes SET title = ?, content = ?, folder = ?, tags = ?, updated = ?, updated_at = ? WHERE id = ?`,
    input.title,
    input.content,
    input.folder,
    JSON.stringify(input.tags),
    now,
    now,
    id
  );
  const next: Note = { id, ...input, updated: now, created: current?.created ?? now, pinned: current?.pinned ?? false, updatedAt: now, deletedAt: null };
  const changedMeta = diffChangedFields(current, next, ['title', 'folder', 'tags', 'updated']);
  void syncPatchNote(id, changedMeta);
  if (!current || current.content !== input.content) {
    void pushNoteContent(id, input.content);
  }
}

export async function softDeleteNote(id: string): Promise<void> {
  const now = new Date().toISOString();
  await getDb().runAsync('UPDATE notes SET deleted_at = ? WHERE id = ?', now, id);
  void syncDeleteNote(id);
}

// Equivalente móvil de `toggleNotePin` en appStore.ts de desktop — ahí
// también pasa por `updateNote`, que siempre pisa `updated` con la fecha
// actual (ver appStore.ts:2733-2744), así que anclar/desanclar una nota
// también la sube al tope del orden "Modificación". Se replica ese mismo
// efecto acá a propósito, no es un descuido.
export async function setNotePinned(id: string, pinned: boolean): Promise<void> {
  const now = new Date().toISOString();
  await getDb().runAsync(
    'UPDATE notes SET pinned = ?, updated = ?, updated_at = ? WHERE id = ?',
    pinned ? 1 : 0,
    now,
    now,
    id
  );
  void syncPatchNote(id, { pinned, updated: now });
}

// ── Sync (logday-server) — metadata (LWW) ─────────────────────────
// Mismo patrón y mismo motivo de ubicación (evita ciclo de import con
// syncEngine.ts) que en db/tasks.ts — ver el comentario ahí.

async function syncCreateNote(note: Note): Promise<void> {
  const runtime = getSyncRuntime();
  if (!runtime?.enabled) return;
  const payload = noteToCreatePayload(note);
  if (!runtime.connected) {
    await syncQueue.enqueue('note', note.id, 'create', payload as unknown as Record<string, unknown>);
    return;
  }
  try {
    const response = await runtime.withSyncAuth((token) => createNoteRemote(runtime.serverUrl, token, payload));
    await applyNoteResponse(note.id, new Date().toISOString(), response);
  } catch {
    await syncQueue.enqueue('note', note.id, 'create', payload as unknown as Record<string, unknown>);
  }
}

async function syncPatchNote(id: string, fields: Partial<Note>): Promise<void> {
  const runtime = getSyncRuntime();
  if (!runtime?.enabled || Object.keys(fields).length === 0) return;
  const payload = noteFieldsToPatchPayload(fields);
  const queuedAt = new Date().toISOString();
  if (!runtime.connected) {
    await syncQueue.enqueue('note', id, 'patch', payload as unknown as Record<string, unknown>);
    return;
  }
  try {
    const response = await runtime.withSyncAuth((token) => patchNoteRemote(runtime.serverUrl, token, id, payload));
    await applyNoteResponse(id, queuedAt, response);
  } catch (e) {
    if (e instanceof SyncApiError && e.status === 404) return;
    await syncQueue.enqueue('note', id, 'patch', payload as unknown as Record<string, unknown>);
  }
}

async function syncDeleteNote(id: string): Promise<void> {
  const runtime = getSyncRuntime();
  if (!runtime?.enabled) return;
  if (!runtime.connected) {
    await syncQueue.enqueue('note', id, 'delete');
    return;
  }
  try {
    await runtime.withSyncAuth((token) => deleteNoteRemote(runtime.serverUrl, token, id));
  } catch (e) {
    if (e instanceof SyncApiError && e.status === 404) return;
    await syncQueue.enqueue('note', id, 'delete');
  }
}

async function writeNoteRow(note: Note, updatedAt: string): Promise<void> {
  await getDb().runAsync(
    `INSERT INTO notes (id, title, folder, tags, created, updated, pinned, content, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title, folder = excluded.folder, tags = excluded.tags, created = excluded.created,
       updated = excluded.updated, pinned = excluded.pinned, content = excluded.content,
       updated_at = excluded.updated_at, deleted_at = NULL`,
    note.id,
    note.title,
    note.folder,
    JSON.stringify(note.tags),
    note.created,
    note.updated,
    note.pinned ? 1 : 0,
    note.content,
    updatedAt
  );
}

/** Aplica la respuesta de un create/patch de metadata — campo por
 * campo, salteando cualquier campo con una entrada más nueva en cola
 * (mismo criterio que `applyTaskResponse` en db/tasks.ts). `content`
 * NUNCA se pisa acá con `response.content` directo (a propósito,
 * mismo motivo que desktop): solo cambia vía el merge CRDT de abajo,
 * si la respuesta trae `content_state`. */
export async function applyNoteResponse(id: string, sinceIso: string, response: NoteApiResponse): Promise<void> {
  const current = await getNote(id);
  if (!current) return;
  const mapped = noteFromApiResponse(response);
  const merged = { ...current } as Record<string, unknown>;
  for (const [localKey, serverKey] of Object.entries(NOTE_FIELD_MAP)) {
    if (!(await syncQueue.hasNewerQueuedField('note', id, serverKey, sinceIso))) {
      merged[localKey] = (mapped as unknown as Record<string, unknown>)[localKey];
    }
  }
  await writeNoteRow(merged as unknown as Note, response.updated_at);
  if (response.content_state) await applyRemoteNoteContentState(id, response.content_state);
}

// ── Sync (logday-server) — contenido (CRDT) ───────────────────────

async function getNoteContentStateB64(id: string): Promise<string | null> {
  const row = await getDb().getFirstAsync<{ content_state: string | null }>(
    'SELECT content_state FROM notes WHERE id = ?',
    id
  );
  return row?.content_state ?? null;
}

async function setNoteContentStateB64(id: string, stateB64: string): Promise<void> {
  await getDb().runAsync('UPDATE notes SET content_state = ? WHERE id = ?', stateB64, id);
}

/** Push del estado Yjs completo de una nota — canal separado de
 * `syncPatchNote` (metadata/LWW). Persiste el snapshot local primero
 * (offline-safe, igual que `content` en texto plano); si hay conexión
 * intenta mandarlo ya, si no (o falla) lo encola en
 * `contentSyncQueue` — llamado desde `updateNote` en cada guardado
 * donde el contenido cambió. El diff se calcula contra el texto que
 * el `Y.Doc` persistido tiene ahora, no contra un valor capturado
 * aparte (ver `crdtText.applyTextEdit`). */
async function pushNoteContent(id: string, newContent: string): Promise<void> {
  const stateB64 = await getNoteContentStateB64(id);
  const doc = docFromStateB64(stateB64);
  applyTextEdit(doc, newContent);
  const nextStateB64 = encodeDocStateB64(doc);
  doc.destroy();
  await setNoteContentStateB64(id, nextStateB64);

  const runtime = getSyncRuntime();
  if (!runtime?.enabled) return;
  if (!runtime.connected) {
    await contentSyncQueue.enqueue('note', id, nextStateB64);
    return;
  }
  try {
    const response = await runtime.withSyncAuth((token) => pushNoteContentRemote(runtime.serverUrl, token, id, nextStateB64));
    // Respuesta completa (metadata + content_state), mismo camino que
    // create/patch — mismo criterio que `syncNoteContent` en desktop:
    // aplica todo por el mismo merge guardado-por-cola, no solo el
    // contenido, aunque este push haya sido solo de contenido.
    await applyNoteResponse(id, new Date().toISOString(), response);
  } catch {
    await contentSyncQueue.enqueue('note', id, nextStateB64);
  }
}

/** Aplica un update Yjs recibido (echo de un push propio, o
 * `content_state` de otro cliente vía pull) al snapshot local — el
 * merge es conmutativo/idempotente (propiedad de Yjs), no importa el
 * orden de llegada. Reescribe `notes.content` (texto plano) solo si
 * el resultado cambió. */
async function applyRemoteNoteContentState(id: string, contentStateB64: string): Promise<void> {
  const current = await getNote(id);
  if (!current) return;
  const stateB64 = await getNoteContentStateB64(id);
  const doc = docFromStateB64(stateB64);
  applyIncomingUpdate(doc, contentStateB64);
  const nextStateB64 = encodeDocStateB64(doc);
  const content = getContentText(doc);
  doc.destroy();
  await setNoteContentStateB64(id, nextStateB64);
  if (content !== current.content) {
    await getDb().runAsync('UPDATE notes SET content = ? WHERE id = ?', content, id);
  }
}

// ── Pull (/sync/changes) ──────────────────────────────────────────

const EPOCH = '0000-01-01T00:00:00.000Z';

export async function applyRemoteNoteChange(change: SyncChange): Promise<void> {
  if (change.deleted) {
    await getDb().runAsync('UPDATE notes SET deleted_at = ? WHERE id = ?', change.updated_at, change.id);
    return;
  }
  const current = await getNote(change.id);
  const data = change.data as NoteApiResponse;
  const mapped = noteFromApiResponse(data);
  const merged = { ...current, ...mapped } as Record<string, unknown>;
  if (current) {
    for (const [localKey, serverKey] of Object.entries(NOTE_FIELD_MAP)) {
      if (await syncQueue.hasNewerQueuedField('note', change.id, serverKey, EPOCH)) {
        merged[localKey] = (current as unknown as Record<string, unknown>)[localKey];
      }
    }
  }
  // `content`: preserva el local si ya existía (se corrige abajo con
  // el merge CRDT si viene `content_state`); si la nota es nueva acá,
  // usa el texto plano de la respuesta como valor inicial.
  merged.content = current?.content ?? data.content ?? '';
  await writeNoteRow(merged as unknown as Note, change.updated_at);
  if (data.content_state) await applyRemoteNoteContentState(change.id, data.content_state);
}
