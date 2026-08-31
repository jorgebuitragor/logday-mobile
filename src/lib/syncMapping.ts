import type { Task, TaskStatus } from '../types/task';
import type { Note } from '../types/note';
import type { OvertimeEntry, OvertimeMonthMeta } from '../types/overtime';
import type { AbsenceDay, AbsenceType } from '../types/absence';

// Conversión tipo local <-> payload REST de logday-server, por
// entidad. Puerto de task-manager/src/lib/syncMapping.ts. Ahora cubre
// las 4 entidades de la Fase 2 (Task/OvertimeEntry/OvertimeMonthMeta/
// AbsenceDay) + Note (metadata — su contenido es CRDT, va por un
// canal aparte, ver `crdtText.ts`/`db/notes.ts`) de la Fase 3.
// CalendarEvent (sin tabla local en mobile) queda fuera. `id` es
// generado por el cliente (uuid) tanto acá como en logday-server, así
// que viaja tal cual en ambas direcciones.
function nowIso(): string {
  return new Date().toISOString();
}

// ─── Task ───

export interface TaskCreatePayload {
  id: string;
  title: string;
  task_code: string | null;
  status: TaskStatus;
  tags: string[];
  project: string;
  created: string;
  completed_at: string | null;
  due: string | null;
  content: string;
  updated_at: string;
}

export interface TaskPatchPayload {
  title?: string;
  task_code?: string | null;
  status?: TaskStatus;
  tags?: string[];
  project?: string;
  created?: string;
  completed_at?: string | null;
  due?: string | null;
  content?: string;
  updated_at: string;
}

export interface TaskApiResponse extends TaskCreatePayload {
  seq: number;
  deleted_at?: string;
}

export function taskToCreatePayload(task: Task): TaskCreatePayload {
  return {
    id: task.id,
    title: task.title,
    task_code: task.taskCode,
    status: task.status,
    tags: task.tags,
    project: task.project,
    created: task.created,
    completed_at: task.completedAt,
    due: task.due,
    content: task.content,
    updated_at: nowIso(),
  };
}

export function taskFieldsToPatchPayload(fields: Partial<Task>): TaskPatchPayload {
  const payload: TaskPatchPayload = { updated_at: nowIso() };
  if ('title' in fields) payload.title = fields.title;
  if ('taskCode' in fields) payload.task_code = fields.taskCode ?? null;
  if ('status' in fields) payload.status = fields.status;
  if ('tags' in fields) payload.tags = fields.tags;
  if ('project' in fields) payload.project = fields.project;
  if ('created' in fields) payload.created = fields.created;
  if ('completedAt' in fields) payload.completed_at = fields.completedAt ?? null;
  if ('due' in fields) payload.due = fields.due ?? null;
  if ('content' in fields) payload.content = fields.content;
  return payload;
}

export function taskFromApiResponse(payload: TaskApiResponse): Omit<Task, 'updatedAt' | 'deletedAt'> {
  return {
    id: payload.id,
    title: payload.title,
    taskCode: payload.task_code,
    status: payload.status,
    tags: payload.tags,
    project: payload.project,
    created: payload.created,
    completedAt: payload.completed_at,
    due: payload.due,
    content: payload.content,
  };
}

// TASK_FIELD_MAP: campo local -> campo servidor, usado para el guard
// "cola gana sobre respuesta/cambio tardío" (ver syncEngine.ts).
export const TASK_FIELD_MAP: Record<string, string> = {
  title: 'title', taskCode: 'task_code', status: 'status', tags: 'tags', project: 'project',
  created: 'created', completedAt: 'completed_at', due: 'due', content: 'content',
};

// ─── OvertimeEntry ───

export interface OvertimeEntryCreatePayload {
  id: string;
  fecha: string;
  solicitada_por: string;
  actividad: string;
  observaciones: string;
  hora_inicio: string;
  hora_final: string;
  total_horas: number;
  extras_diurnas: number;
  extras_nocturnas: number;
  extras_diurnas_festivas: number;
  extras_nocturnas_festivas: number;
  updated_at: string;
}

export interface OvertimeEntryPatchPayload {
  fecha?: string;
  solicitada_por?: string;
  actividad?: string;
  observaciones?: string;
  hora_inicio?: string;
  hora_final?: string;
  total_horas?: number;
  extras_diurnas?: number;
  extras_nocturnas?: number;
  extras_diurnas_festivas?: number;
  extras_nocturnas_festivas?: number;
  updated_at: string;
}

export interface OvertimeEntryApiResponse extends OvertimeEntryCreatePayload {
  seq: number;
  deleted_at?: string;
}

export function overtimeEntryToCreatePayload(entry: OvertimeEntry): OvertimeEntryCreatePayload {
  return {
    id: entry.id,
    fecha: entry.fecha,
    solicitada_por: entry.solicitadaPor,
    actividad: entry.actividad,
    observaciones: entry.observaciones,
    hora_inicio: entry.horaInicio,
    hora_final: entry.horaFinal,
    total_horas: entry.totalHoras,
    extras_diurnas: entry.extrasDiurnas,
    extras_nocturnas: entry.extrasNocturnas,
    extras_diurnas_festivas: entry.extrasDiurnasFestivas,
    extras_nocturnas_festivas: entry.extrasNocturnasFestivas,
    updated_at: nowIso(),
  };
}

export function overtimeEntryFieldsToPatchPayload(fields: Partial<OvertimeEntry>): OvertimeEntryPatchPayload {
  const payload: OvertimeEntryPatchPayload = { updated_at: nowIso() };
  if ('fecha' in fields) payload.fecha = fields.fecha;
  if ('solicitadaPor' in fields) payload.solicitada_por = fields.solicitadaPor;
  if ('actividad' in fields) payload.actividad = fields.actividad;
  if ('observaciones' in fields) payload.observaciones = fields.observaciones;
  if ('horaInicio' in fields) payload.hora_inicio = fields.horaInicio;
  if ('horaFinal' in fields) payload.hora_final = fields.horaFinal;
  if ('totalHoras' in fields) payload.total_horas = fields.totalHoras;
  if ('extrasDiurnas' in fields) payload.extras_diurnas = fields.extrasDiurnas;
  if ('extrasNocturnas' in fields) payload.extras_nocturnas = fields.extrasNocturnas;
  if ('extrasDiurnasFestivas' in fields) payload.extras_diurnas_festivas = fields.extrasDiurnasFestivas;
  if ('extrasNocturnasFestivas' in fields) payload.extras_nocturnas_festivas = fields.extrasNocturnasFestivas;
  return payload;
}

export function overtimeEntryFromApiResponse(payload: OvertimeEntryApiResponse): Omit<OvertimeEntry, 'updatedAt' | 'deletedAt'> {
  return {
    id: payload.id,
    fecha: payload.fecha,
    solicitadaPor: payload.solicitada_por,
    actividad: payload.actividad,
    observaciones: payload.observaciones,
    horaInicio: payload.hora_inicio,
    horaFinal: payload.hora_final,
    totalHoras: payload.total_horas,
    extrasDiurnas: payload.extras_diurnas,
    extrasNocturnas: payload.extras_nocturnas,
    extrasDiurnasFestivas: payload.extras_diurnas_festivas,
    extrasNocturnasFestivas: payload.extras_nocturnas_festivas,
  };
}

export const OVERTIME_ENTRY_FIELD_MAP: Record<string, string> = {
  fecha: 'fecha', solicitadaPor: 'solicitada_por', actividad: 'actividad', observaciones: 'observaciones',
  horaInicio: 'hora_inicio', horaFinal: 'hora_final', totalHoras: 'total_horas',
  extrasDiurnas: 'extras_diurnas', extrasNocturnas: 'extras_nocturnas',
  extrasDiurnasFestivas: 'extras_diurnas_festivas', extrasNocturnasFestivas: 'extras_nocturnas_festivas',
};

// ─── OvertimeMonthMeta ───
// Sin POST propio — el server crea-si-no-existe con el primer PATCH.
// El año-mes va en la URL, no en el body.

export interface OvertimeMonthMetaPatchPayload {
  colaborador?: string;
  cedula?: string;
  updated_at: string;
}

export interface OvertimeMonthMetaApiResponse {
  year_month: string;
  colaborador: string;
  cedula: string;
  seq: number;
  updated_at: string;
  deleted_at?: string;
}

export function overtimeMonthMetaFieldsToPatchPayload(fields: Partial<OvertimeMonthMeta>): OvertimeMonthMetaPatchPayload {
  const payload: OvertimeMonthMetaPatchPayload = { updated_at: nowIso() };
  if ('colaborador' in fields) payload.colaborador = fields.colaborador;
  if ('cedula' in fields) payload.cedula = fields.cedula;
  return payload;
}

export function overtimeMonthMetaFromApiResponse(payload: OvertimeMonthMetaApiResponse): Omit<OvertimeMonthMeta, 'updatedAt' | 'deletedAt'> {
  return {
    yearMonth: payload.year_month,
    colaborador: payload.colaborador,
    cedula: payload.cedula,
  };
}

export const OVERTIME_MONTH_META_FIELD_MAP: Record<string, string> = {
  colaborador: 'colaborador', cedula: 'cedula',
};

// ─── AbsenceDay ───

export interface AbsenceDayCreatePayload {
  id: string;
  date: string;
  type: AbsenceType;
  note: string | null;
  updated_at: string;
}

export interface AbsenceDayPatchPayload {
  date?: string;
  type?: AbsenceType;
  note?: string | null;
  updated_at: string;
}

export interface AbsenceDayApiResponse extends AbsenceDayCreatePayload {
  seq: number;
  deleted_at?: string;
}

export function absenceDayToCreatePayload(absence: AbsenceDay): AbsenceDayCreatePayload {
  return {
    id: absence.id,
    date: absence.date,
    type: absence.type,
    note: absence.note,
    updated_at: nowIso(),
  };
}

export function absenceDayFieldsToPatchPayload(fields: Partial<AbsenceDay>): AbsenceDayPatchPayload {
  const payload: AbsenceDayPatchPayload = { updated_at: nowIso() };
  if ('date' in fields) payload.date = fields.date;
  if ('type' in fields) payload.type = fields.type;
  if ('note' in fields) payload.note = fields.note ?? null;
  return payload;
}

export function absenceDayFromApiResponse(payload: AbsenceDayApiResponse): Omit<AbsenceDay, 'updatedAt' | 'deletedAt'> {
  return {
    id: payload.id,
    date: payload.date,
    type: payload.type,
    note: payload.note,
  };
}

export const ABSENCE_DAY_FIELD_MAP: Record<string, string> = {
  date: 'date', type: 'type', note: 'note',
};

// ─── Note (metadata) ───
// Content es CRDT (Y.Text), va por POST /notes/:id/content — fuera de
// este mapeo, ver crdtText.ts/db/notes.ts.

export interface NoteCreatePayload {
  id: string;
  title: string;
  folder: string;
  tags: string[];
  created: string;
  updated: string;
  pinned: boolean;
  updated_at: string;
}

export interface NotePatchPayload {
  title?: string;
  folder?: string;
  tags?: string[];
  created?: string;
  updated?: string;
  pinned?: boolean;
  updated_at: string;
}

export interface NoteApiResponse extends NoteCreatePayload {
  content: string;
  content_state?: string;
  seq: number;
  deleted_at?: string;
}

export function noteToCreatePayload(note: Note): NoteCreatePayload {
  return {
    id: note.id,
    title: note.title,
    folder: note.folder,
    tags: note.tags,
    created: note.created,
    updated: note.updated,
    pinned: note.pinned,
    updated_at: nowIso(),
  };
}

export function noteFieldsToPatchPayload(fields: Partial<Note>): NotePatchPayload {
  const payload: NotePatchPayload = { updated_at: nowIso() };
  if ('title' in fields) payload.title = fields.title;
  if ('folder' in fields) payload.folder = fields.folder;
  if ('tags' in fields) payload.tags = fields.tags;
  if ('created' in fields) payload.created = fields.created;
  if ('updated' in fields) payload.updated = fields.updated;
  if ('pinned' in fields) payload.pinned = fields.pinned;
  return payload;
}

// content/content_state quedan afuera — metadata únicamente.
export function noteFromApiResponse(payload: NoteApiResponse): Omit<Note, 'content' | 'updatedAt' | 'deletedAt'> {
  return {
    id: payload.id,
    title: payload.title,
    folder: payload.folder,
    tags: payload.tags,
    created: payload.created,
    updated: payload.updated,
    pinned: payload.pinned,
  };
}

export const NOTE_FIELD_MAP: Record<string, string> = {
  title: 'title', folder: 'folder', tags: 'tags', created: 'created', updated: 'updated', pinned: 'pinned',
};

// ─── DailyEntry (contenido, CRDT) ───
// Sin tipo local propio de metadata — un daily es solo `{date,
// content}` (ver types/dailyEntry.ts), `date` es la key natural tanto
// acá como en logday-server (PUT /daily-entries/:date). Todo el
// contenido es CRDT, PUT-only con content_update — sin create ni
// patch de metadata, por eso no hace falta un CreatePayload/
// PatchPayload acá como en las demás entidades.

export interface DailyEntryApiResponse {
  date: string;
  content: string;
  content_state?: string;
  seq: number;
  updated_at: string;
  deleted_at?: string;
}
