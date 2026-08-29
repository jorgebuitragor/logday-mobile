import { getDb } from './index';

export type SearchResultKind = 'task' | 'note' | 'daily' | 'overtime';

export interface SearchResult {
  kind: SearchResultKind;
  id: string; // para 'daily', es la fecha (clave natural, sin id propio)
  title: string;
  snippet: string;
}

const RESULT_LIMIT = 10;

function snippetFrom(text: string, query: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  const idx = flat.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return flat.slice(0, 80);
  const start = Math.max(0, idx - 20);
  return `${start > 0 ? '…' : ''}${flat.slice(start, start + 100)}…`;
}

/**
 * Búsqueda simple (LIKE) en las 4 entidades del MVP. Extiende a
 * propósito la búsqueda global de desktop (SearchModal.tsx), que hoy
 * solo cubre Tasks + Dailys — Notes y Overtime se agregaron acá
 * porque el usuario pidió explícitamente "búsqueda en todas las
 * secciones". Sin ranking/relevancia — coincide o no, orden por
 * fecha/actualización descendente dentro de cada grupo.
 */
export async function searchAll(query: string): Promise<Record<SearchResultKind, SearchResult[]>> {
  const empty: Record<SearchResultKind, SearchResult[]> = { task: [], note: [], daily: [], overtime: [] };
  const q = query.trim();
  if (q.length < 2) return empty;

  const like = `%${q}%`;
  const db = getDb();

  const taskRows = await db.getAllAsync<{ id: string; title: string; content: string }>(
    `SELECT id, title, content FROM tasks
     WHERE deleted_at IS NULL AND (title LIKE ? OR content LIKE ?)
     ORDER BY created DESC LIMIT ?`,
    like,
    like,
    RESULT_LIMIT
  );

  const noteRows = await db.getAllAsync<{ id: string; title: string; content: string }>(
    `SELECT id, title, content FROM notes
     WHERE deleted_at IS NULL AND (title LIKE ? OR content LIKE ?)
     ORDER BY updated DESC LIMIT ?`,
    like,
    like,
    RESULT_LIMIT
  );

  const dailyRows = await db.getAllAsync<{ date: string; content: string }>(
    `SELECT date, content FROM daily_entries
     WHERE deleted_at IS NULL AND content LIKE ?
     ORDER BY date DESC LIMIT ?`,
    like,
    RESULT_LIMIT
  );

  const overtimeRows = await db.getAllAsync<{ id: string; fecha: string; actividad: string; solicitada_por: string }>(
    `SELECT id, fecha, actividad, solicitada_por FROM overtime_entries
     WHERE deleted_at IS NULL AND (actividad LIKE ? OR solicitada_por LIKE ?)
     ORDER BY fecha DESC LIMIT ?`,
    like,
    like,
    RESULT_LIMIT
  );

  return {
    task: taskRows.map((r) => ({ kind: 'task', id: r.id, title: r.title, snippet: snippetFrom(r.content, q) })),
    note: noteRows.map((r) => ({ kind: 'note', id: r.id, title: r.title, snippet: snippetFrom(r.content, q) })),
    daily: dailyRows.map((r) => ({ kind: 'daily', id: r.date, title: r.date, snippet: snippetFrom(r.content, q) })),
    overtime: overtimeRows.map((r) => ({
      kind: 'overtime',
      id: r.id,
      title: r.fecha,
      snippet: snippetFrom(r.actividad || r.solicitada_por, q),
    })),
  };
}
