import type { TaskStatus } from '../types/task';
import { getDb } from './index';

export type SearchResultKind = 'task' | 'note' | 'daily' | 'overtime';

export interface SearchResult {
  kind: SearchResultKind;
  id: string; // para 'daily', es la fecha (clave natural, sin id propio)
  title: string;
  snippet: string;
  // Metadata usada solo para filtrar/rankear, no toda aplica a todos
  // los `kind` — `date` es la fecha relevante de cada entidad (due de
  // task, fecha de daily/overtime, `updated` de note) para el filtro
  // de rango; `label` es lo que matchea contra el filtro de
  // proyecto/tag (project o cualquier tag de una task; tag o carpeta
  // de una nota).
  date: string | null;
  status?: TaskStatus;
  labels?: string[];
}

export interface SearchFilters {
  kinds: SearchResultKind[]; // vacío = todas
  statuses: TaskStatus[]; // vacío = todos (solo aplica a task)
  label: string | null; // proyecto/carpeta/tag exacto elegido de un chip
  dateFrom: string | null; // ISO, inclusive
  dateTo: string | null; // ISO, inclusive
}

export const EMPTY_FILTERS: SearchFilters = {
  kinds: [],
  statuses: [],
  label: null,
  dateFrom: null,
  dateTo: null,
};

const RESULT_LIMIT = 10;
// Se sobre-pide antes de rankear/filtrar en JS (ver `scoreMatch` y los
// filtros de `label`/fecha, que no viven en el WHERE de SQL) y luego
// se recorta a RESULT_LIMIT — sin esto, un filtro que descarta la
// mitad de los primeros 10 resultados dejaría la lista corta aunque
// hubiera más coincidencias reales.
const FETCH_LIMIT = 40;

function snippetFrom(text: string, query: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  const idx = flat.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return flat.slice(0, 80);
  const start = Math.max(0, idx - 20);
  return `${start > 0 ? '…' : ''}${flat.slice(start, start + 100)}…`;
}

// Antes esto no existía: cualquier coincidencia (título o contenido,
// sin distinción) se mostraba en el mismo orden que la tabla ya traía
// (fecha/actualización descendente) — un match de substring perdido
// en medio del contenido de un registro viejo aparecía antes que un
// match exacto de título en uno reciente. Ahora se prioriza dónde
// coincidió: título completo > título empieza con > título contiene >
// solo en otro campo (contenido/tags/proyecto/etc — si el título no
// matchea pero la fila igual llegó acá, matcheó en otro campo por
// construcción del WHERE de la query SQL, no hace falta revisar cuál).
// El orden por fecha de antes queda como desempate (`sort` estable,
// preserva el ORDER BY de cada query SQL).
function scoreMatch(query: string, title: string): number {
  const q = query.trim().toLowerCase();
  const t = title.toLowerCase();
  if (t === q) return 4;
  if (t.startsWith(q)) return 3;
  if (t.includes(q)) return 2;
  return 1;
}

function inDateRange(date: string | null, filters: SearchFilters): boolean {
  if (!filters.dateFrom && !filters.dateTo) return true;
  if (!date) return false;
  if (filters.dateFrom && date < filters.dateFrom) return false;
  if (filters.dateTo && date > filters.dateTo) return false;
  return true;
}

function matchesLabel(result: SearchResult, filters: SearchFilters): boolean {
  if (!filters.label) return true;
  return result.labels?.includes(filters.label) ?? false;
}

function rankAndFilter(query: string, rows: SearchResult[], filters: SearchFilters): SearchResult[] {
  return rows
    .filter((r) => inDateRange(r.date, filters) && matchesLabel(r, filters))
    .map((r) => ({ r, score: scoreMatch(query, r.title) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, RESULT_LIMIT)
    .map(({ r }) => r);
}

function includesKind(filters: SearchFilters, kind: SearchResultKind): boolean {
  return filters.kinds.length === 0 || filters.kinds.includes(kind);
}

/**
 * Búsqueda global en las 4 entidades del MVP. Antes solo buscaba en
 * título+contenido; ahora también en los campos que cada listado ya
 * muestra pero que no se podían encontrar por texto (`taskCode`,
 * `project`, `tags` de tasks; `tags`/`folder` de notes;
 * `observaciones` de overtime) — ver specs/busqueda/.
 */
export async function searchAll(query: string, filters: SearchFilters = EMPTY_FILTERS): Promise<Record<SearchResultKind, SearchResult[]>> {
  const empty: Record<SearchResultKind, SearchResult[]> = { task: [], note: [], daily: [], overtime: [] };
  const q = query.trim();
  if (q.length < 2) return empty;

  const like = `%${q}%`;
  const db = getDb();

  let taskResults: SearchResult[] = [];
  if (includesKind(filters, 'task')) {
    const statusClause = filters.statuses.length > 0 ? ` AND status IN (${filters.statuses.map(() => '?').join(',')})` : '';
    const taskRows = await db.getAllAsync<{
      id: string;
      title: string;
      content: string;
      task_code: string | null;
      project: string;
      tags: string;
      status: TaskStatus;
      due: string | null;
    }>(
      `SELECT id, title, content, task_code, project, tags, status, due FROM tasks
       WHERE deleted_at IS NULL AND (title LIKE ? OR content LIKE ? OR task_code LIKE ? OR project LIKE ? OR tags LIKE ?)${statusClause}
       ORDER BY created DESC LIMIT ?`,
      like,
      like,
      like,
      like,
      like,
      ...filters.statuses,
      FETCH_LIMIT
    );
    taskResults = taskRows.map((r) => ({
      kind: 'task' as const,
      id: r.id,
      title: r.title,
      snippet: snippetFrom(r.content || r.task_code || r.project || '', q),
      date: r.due,
      status: r.status,
      labels: [r.project, ...(JSON.parse(r.tags) as string[])].filter(Boolean),
    }));
  }

  let noteResults: SearchResult[] = [];
  if (includesKind(filters, 'note')) {
    const noteRows = await db.getAllAsync<{ id: string; title: string; content: string; tags: string; folder: string; updated: string }>(
      `SELECT id, title, content, tags, folder, updated FROM notes
       WHERE deleted_at IS NULL AND (title LIKE ? OR content LIKE ? OR tags LIKE ? OR folder LIKE ?)
       ORDER BY updated DESC LIMIT ?`,
      like,
      like,
      like,
      like,
      FETCH_LIMIT
    );
    noteResults = noteRows.map((r) => ({
      kind: 'note' as const,
      id: r.id,
      title: r.title,
      snippet: snippetFrom(r.content, q),
      date: r.updated,
      labels: [r.folder, ...(JSON.parse(r.tags) as string[])].filter(Boolean),
    }));
  }

  let dailyResults: SearchResult[] = [];
  if (includesKind(filters, 'daily')) {
    const dailyRows = await db.getAllAsync<{ date: string; content: string }>(
      `SELECT date, content FROM daily_entries
       WHERE deleted_at IS NULL AND content LIKE ?
       ORDER BY date DESC LIMIT ?`,
      like,
      FETCH_LIMIT
    );
    dailyResults = dailyRows.map((r) => ({
      kind: 'daily' as const,
      id: r.date,
      title: r.date,
      snippet: snippetFrom(r.content, q),
      date: r.date,
    }));
  }

  let overtimeResults: SearchResult[] = [];
  if (includesKind(filters, 'overtime')) {
    const overtimeRows = await db.getAllAsync<{
      id: string;
      fecha: string;
      actividad: string;
      solicitada_por: string;
      observaciones: string;
    }>(
      `SELECT id, fecha, actividad, solicitada_por, observaciones FROM overtime_entries
       WHERE deleted_at IS NULL AND (actividad LIKE ? OR solicitada_por LIKE ? OR observaciones LIKE ?)
       ORDER BY fecha DESC LIMIT ?`,
      like,
      like,
      like,
      FETCH_LIMIT
    );
    overtimeResults = overtimeRows.map((r) => ({
      kind: 'overtime' as const,
      id: r.id,
      title: r.fecha,
      snippet: snippetFrom(r.actividad || r.solicitada_por || r.observaciones, q),
      date: r.fecha,
    }));
  }

  // Siempre se rankea (no solo cuando hay filtros activos) — la
  // mejora de precisión (título > resto de campos) aplica igual sin
  // filtros. El filtro de proyecto/tag descarta dailys/overtime por
  // completo cuando está activo (ver `matchesLabel`: `labels` queda
  // `undefined` para esos dos, y `undefined?.includes(...)` es
  // `false`) — ninguna de las dos entidades tiene ese concepto, así
  // que "filtrar por X" no debería mostrarlas igual.
  return {
    task: rankAndFilter(q, taskResults, filters),
    note: rankAndFilter(q, noteResults, filters),
    daily: rankAndFilter(q, dailyResults, filters),
    overtime: rankAndFilter(q, overtimeResults, filters),
  };
}

/**
 * Valores conocidos de proyecto/carpeta/tag (tasks + notes) para
 * poblar los chips del filtro de "proyecto o tag" — dailys/overtime no
 * aportan nada acá, no tienen ese concepto.
 */
export async function listSearchLabels(): Promise<string[]> {
  const db = getDb();
  const taskRows = await db.getAllAsync<{ project: string; tags: string }>(
    'SELECT project, tags FROM tasks WHERE deleted_at IS NULL'
  );
  const noteRows = await db.getAllAsync<{ tags: string; folder: string }>(
    'SELECT tags, folder FROM notes WHERE deleted_at IS NULL'
  );
  const labels = new Set<string>();
  for (const r of taskRows) {
    if (r.project && r.project !== 'inbox') labels.add(r.project);
    (JSON.parse(r.tags) as string[]).forEach((tag) => labels.add(tag));
  }
  for (const r of noteRows) {
    if (r.folder) labels.add(r.folder);
    (JSON.parse(r.tags) as string[]).forEach((tag) => labels.add(tag));
  }
  return Array.from(labels).sort();
}
