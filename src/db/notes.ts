import { randomUUID } from 'expo-crypto';

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
  return id;
}

export async function updateNote(id: string, input: NoteInput): Promise<void> {
  const now = new Date().toISOString();
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
}

export async function softDeleteNote(id: string): Promise<void> {
  const now = new Date().toISOString();
  await getDb().runAsync('UPDATE notes SET deleted_at = ? WHERE id = ?', now, id);
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
}
