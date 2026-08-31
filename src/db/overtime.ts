import { randomUUID } from 'expo-crypto';

import { calcOvertimeBreakdown } from '../lib/overtimeCalc';
import { diffChangedFields } from '../lib/objectDiff';
import {
  createOvertimeEntryRemote, deleteOvertimeEntryRemote, patchOvertimeEntryRemote, patchOvertimeMonthMetaRemote,
  SyncApiError, type SyncChange,
} from '../lib/syncApi';
import {
  overtimeEntryFieldsToPatchPayload, overtimeEntryFromApiResponse, overtimeEntryToCreatePayload, OVERTIME_ENTRY_FIELD_MAP,
  overtimeMonthMetaFieldsToPatchPayload, overtimeMonthMetaFromApiResponse, OVERTIME_MONTH_META_FIELD_MAP,
  type OvertimeEntryApiResponse, type OvertimeMonthMetaApiResponse,
} from '../lib/syncMapping';
import * as syncQueue from '../lib/syncQueue';
import { getSyncRuntime } from '../lib/syncRuntime';
import type { OvertimeEntry, OvertimeMonthMeta } from '../types/overtime';
import { getDb } from './index';

interface OvertimeEntryRow {
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
  deleted_at: string | null;
}

function rowToOvertimeEntry(row: OvertimeEntryRow): OvertimeEntry {
  return {
    id: row.id,
    fecha: row.fecha,
    solicitadaPor: row.solicitada_por,
    actividad: row.actividad,
    observaciones: row.observaciones,
    horaInicio: row.hora_inicio,
    horaFinal: row.hora_final,
    totalHoras: row.total_horas,
    extrasDiurnas: row.extras_diurnas,
    extrasNocturnas: row.extras_nocturnas,
    extrasDiurnasFestivas: row.extras_diurnas_festivas,
    extrasNocturnasFestivas: row.extras_nocturnas_festivas,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export async function listOvertimeEntries(): Promise<OvertimeEntry[]> {
  const rows = await getDb().getAllAsync<OvertimeEntryRow>(
    'SELECT * FROM overtime_entries WHERE deleted_at IS NULL ORDER BY fecha DESC, hora_inicio DESC'
  );
  return rows.map(rowToOvertimeEntry);
}

export async function getOvertimeEntry(id: string): Promise<OvertimeEntry | null> {
  const row = await getDb().getFirstAsync<OvertimeEntryRow>('SELECT * FROM overtime_entries WHERE id = ?', id);
  return row ? rowToOvertimeEntry(row) : null;
}

export interface OvertimeInput {
  fecha: string;
  solicitadaPor: string;
  actividad: string;
  observaciones: string;
  horaInicio: string;
  horaFinal: string;
}

export async function createOvertimeEntry(input: OvertimeInput): Promise<string> {
  const id = randomUUID();
  const now = new Date().toISOString();
  const b = calcOvertimeBreakdown(input.fecha, input.horaInicio, input.horaFinal);
  await getDb().runAsync(
    `INSERT INTO overtime_entries
       (id, fecha, solicitada_por, actividad, observaciones, hora_inicio, hora_final,
        total_horas, extras_diurnas, extras_nocturnas, extras_diurnas_festivas, extras_nocturnas_festivas,
        updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    id,
    input.fecha,
    input.solicitadaPor,
    input.actividad,
    input.observaciones,
    input.horaInicio,
    input.horaFinal,
    b.totalHoras,
    b.extrasDiurnas,
    b.extrasNocturnas,
    b.extrasDiurnasFestivas,
    b.extrasNocturnasFestivas,
    now
  );
  void syncCreateOvertimeEntry({
    id, ...input,
    totalHoras: b.totalHoras, extrasDiurnas: b.extrasDiurnas, extrasNocturnas: b.extrasNocturnas,
    extrasDiurnasFestivas: b.extrasDiurnasFestivas, extrasNocturnasFestivas: b.extrasNocturnasFestivas,
    updatedAt: now, deletedAt: null,
  });
  return id;
}

export async function updateOvertimeEntry(id: string, input: OvertimeInput): Promise<void> {
  const now = new Date().toISOString();
  const current = await getOvertimeEntry(id);
  const b = calcOvertimeBreakdown(input.fecha, input.horaInicio, input.horaFinal);
  await getDb().runAsync(
    `UPDATE overtime_entries SET
       fecha = ?, solicitada_por = ?, actividad = ?, observaciones = ?, hora_inicio = ?, hora_final = ?,
       total_horas = ?, extras_diurnas = ?, extras_nocturnas = ?, extras_diurnas_festivas = ?, extras_nocturnas_festivas = ?,
       updated_at = ?
     WHERE id = ?`,
    input.fecha,
    input.solicitadaPor,
    input.actividad,
    input.observaciones,
    input.horaInicio,
    input.horaFinal,
    b.totalHoras,
    b.extrasDiurnas,
    b.extrasNocturnas,
    b.extrasDiurnasFestivas,
    b.extrasNocturnasFestivas,
    now,
    id
  );
  const next: OvertimeEntry = {
    id, ...input,
    totalHoras: b.totalHoras, extrasDiurnas: b.extrasDiurnas, extrasNocturnas: b.extrasNocturnas,
    extrasDiurnasFestivas: b.extrasDiurnasFestivas, extrasNocturnasFestivas: b.extrasNocturnasFestivas,
    updatedAt: now, deletedAt: null,
  };
  const changed = diffChangedFields(current, next, [
    'fecha', 'solicitadaPor', 'actividad', 'observaciones', 'horaInicio', 'horaFinal',
    'totalHoras', 'extrasDiurnas', 'extrasNocturnas', 'extrasDiurnasFestivas', 'extrasNocturnasFestivas',
  ]);
  void syncPatchOvertimeEntry(id, changed);
}

export async function softDeleteOvertimeEntry(id: string): Promise<void> {
  const now = new Date().toISOString();
  await getDb().runAsync('UPDATE overtime_entries SET deleted_at = ? WHERE id = ?', now, id);
  void syncDeleteOvertimeEntry(id);
}

interface OvertimeMonthMetaRow {
  year_month: string;
  colaborador: string;
  cedula: string;
  updated_at: string;
  deleted_at: string | null;
}

// Necesaria para que el export a Excel de un mes (`overtimeExport.ts`)
// pueda incluir estos dos campos igual que desktop.
export async function getOvertimeMonthMeta(yearMonth: string): Promise<OvertimeMonthMeta | null> {
  const row = await getDb().getFirstAsync<OvertimeMonthMetaRow>(
    'SELECT * FROM overtime_month_meta WHERE year_month = ? AND deleted_at IS NULL',
    yearMonth
  );
  if (!row) return null;
  return {
    yearMonth: row.year_month,
    colaborador: row.colaborador,
    cedula: row.cedula,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

// UI propia en `OvertimeMonthActionsSheet` para editar colaborador/
// cédula por mes. Upsert: la fila puede no existir todavía para un
// mes sin exportar antes.
export async function upsertOvertimeMonthMeta(yearMonth: string, colaborador: string, cedula: string): Promise<void> {
  const now = new Date().toISOString();
  const current = await getOvertimeMonthMeta(yearMonth);
  await getDb().runAsync(
    `INSERT INTO overtime_month_meta (year_month, colaborador, cedula, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, NULL)
     ON CONFLICT(year_month) DO UPDATE SET colaborador = excluded.colaborador, cedula = excluded.cedula, updated_at = excluded.updated_at, deleted_at = NULL`,
    yearMonth,
    colaborador,
    cedula,
    now
  );
  const next: OvertimeMonthMeta = { yearMonth, colaborador, cedula, updatedAt: now, deletedAt: null };
  const changed = diffChangedFields(current, next, ['colaborador', 'cedula']);
  void syncPatchOvertimeMonthMeta(yearMonth, changed);
}

// ── Sync (logday-server) ──────────────────────────────────────────
// Mismo patrón y mismo motivo de ubicación que en db/tasks.ts (ver el
// comentario ahí) — evita un ciclo de import entre este archivo y
// syncEngine.ts.

async function syncCreateOvertimeEntry(entry: OvertimeEntry): Promise<void> {
  const runtime = getSyncRuntime();
  if (!runtime?.enabled) return;
  const payload = overtimeEntryToCreatePayload(entry);
  if (!runtime.connected) {
    await syncQueue.enqueue('overtime_entry', entry.id, 'create', payload as unknown as Record<string, unknown>);
    return;
  }
  try {
    const response = await runtime.withSyncAuth((token) => createOvertimeEntryRemote(runtime.serverUrl, token, payload));
    await applyOvertimeEntryResponse(entry.id, new Date().toISOString(), response);
  } catch {
    await syncQueue.enqueue('overtime_entry', entry.id, 'create', payload as unknown as Record<string, unknown>);
  }
}

async function syncPatchOvertimeEntry(id: string, fields: Partial<OvertimeEntry>): Promise<void> {
  const runtime = getSyncRuntime();
  if (!runtime?.enabled || Object.keys(fields).length === 0) return;
  const payload = overtimeEntryFieldsToPatchPayload(fields);
  const queuedAt = new Date().toISOString();
  if (!runtime.connected) {
    await syncQueue.enqueue('overtime_entry', id, 'patch', payload as unknown as Record<string, unknown>);
    return;
  }
  try {
    const response = await runtime.withSyncAuth((token) => patchOvertimeEntryRemote(runtime.serverUrl, token, id, payload));
    await applyOvertimeEntryResponse(id, queuedAt, response);
  } catch (e) {
    if (e instanceof SyncApiError && e.status === 404) return;
    await syncQueue.enqueue('overtime_entry', id, 'patch', payload as unknown as Record<string, unknown>);
  }
}

async function syncDeleteOvertimeEntry(id: string): Promise<void> {
  const runtime = getSyncRuntime();
  if (!runtime?.enabled) return;
  if (!runtime.connected) {
    await syncQueue.enqueue('overtime_entry', id, 'delete');
    return;
  }
  try {
    await runtime.withSyncAuth((token) => deleteOvertimeEntryRemote(runtime.serverUrl, token, id));
  } catch (e) {
    if (e instanceof SyncApiError && e.status === 404) return;
    await syncQueue.enqueue('overtime_entry', id, 'delete');
  }
}

async function syncPatchOvertimeMonthMeta(yearMonth: string, fields: Partial<OvertimeMonthMeta>): Promise<void> {
  const runtime = getSyncRuntime();
  if (!runtime?.enabled || Object.keys(fields).length === 0) return;
  const payload = overtimeMonthMetaFieldsToPatchPayload(fields);
  const queuedAt = new Date().toISOString();
  if (!runtime.connected) {
    await syncQueue.enqueue('overtime_month_meta', yearMonth, 'patch', payload as unknown as Record<string, unknown>);
    return;
  }
  try {
    const response = await runtime.withSyncAuth((token) => patchOvertimeMonthMetaRemote(runtime.serverUrl, token, yearMonth, payload));
    await applyOvertimeMonthMetaResponse(yearMonth, queuedAt, response);
  } catch {
    await syncQueue.enqueue('overtime_month_meta', yearMonth, 'patch', payload as unknown as Record<string, unknown>);
  }
}

const EPOCH = '0000-01-01T00:00:00.000Z';

async function writeOvertimeEntryRow(entry: OvertimeEntry, updatedAt: string): Promise<void> {
  await getDb().runAsync(
    `INSERT INTO overtime_entries
       (id, fecha, solicitada_por, actividad, observaciones, hora_inicio, hora_final,
        total_horas, extras_diurnas, extras_nocturnas, extras_diurnas_festivas, extras_nocturnas_festivas,
        updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
     ON CONFLICT(id) DO UPDATE SET
       fecha = excluded.fecha, solicitada_por = excluded.solicitada_por, actividad = excluded.actividad,
       observaciones = excluded.observaciones, hora_inicio = excluded.hora_inicio, hora_final = excluded.hora_final,
       total_horas = excluded.total_horas, extras_diurnas = excluded.extras_diurnas,
       extras_nocturnas = excluded.extras_nocturnas, extras_diurnas_festivas = excluded.extras_diurnas_festivas,
       extras_nocturnas_festivas = excluded.extras_nocturnas_festivas, updated_at = excluded.updated_at, deleted_at = NULL`,
    entry.id,
    entry.fecha,
    entry.solicitadaPor,
    entry.actividad,
    entry.observaciones,
    entry.horaInicio,
    entry.horaFinal,
    entry.totalHoras,
    entry.extrasDiurnas,
    entry.extrasNocturnas,
    entry.extrasDiurnasFestivas,
    entry.extrasNocturnasFestivas,
    updatedAt
  );
}

async function applyOvertimeEntryResponse(id: string, sinceIso: string, response: OvertimeEntryApiResponse): Promise<void> {
  const current = await getOvertimeEntry(id);
  if (!current) return;
  const mapped = overtimeEntryFromApiResponse(response);
  const merged = { ...current } as Record<string, unknown>;
  for (const [localKey, serverKey] of Object.entries(OVERTIME_ENTRY_FIELD_MAP)) {
    if (!(await syncQueue.hasNewerQueuedField('overtime_entry', id, serverKey, sinceIso))) {
      merged[localKey] = (mapped as unknown as Record<string, unknown>)[localKey];
    }
  }
  await writeOvertimeEntryRow(merged as unknown as OvertimeEntry, response.updated_at);
}

async function applyOvertimeMonthMetaResponse(yearMonth: string, sinceIso: string, response: OvertimeMonthMetaApiResponse): Promise<void> {
  const current = await getOvertimeMonthMeta(yearMonth);
  const mapped = overtimeMonthMetaFromApiResponse(response);
  const merged = { ...current, yearMonth } as Record<string, unknown>;
  for (const [localKey, serverKey] of Object.entries(OVERTIME_MONTH_META_FIELD_MAP)) {
    if (!(await syncQueue.hasNewerQueuedField('overtime_month_meta', yearMonth, serverKey, sinceIso))) {
      merged[localKey] = (mapped as unknown as Record<string, unknown>)[localKey];
    }
  }
  await getDb().runAsync(
    `INSERT INTO overtime_month_meta (year_month, colaborador, cedula, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, NULL)
     ON CONFLICT(year_month) DO UPDATE SET colaborador = excluded.colaborador, cedula = excluded.cedula, updated_at = excluded.updated_at, deleted_at = NULL`,
    yearMonth,
    merged.colaborador as string,
    merged.cedula as string,
    response.updated_at
  );
}

export async function applyRemoteOvertimeEntryChange(change: SyncChange): Promise<void> {
  if (change.deleted) {
    await getDb().runAsync('UPDATE overtime_entries SET deleted_at = ? WHERE id = ?', change.updated_at, change.id);
    return;
  }
  const current = await getOvertimeEntry(change.id);
  const mapped = overtimeEntryFromApiResponse(change.data as OvertimeEntryApiResponse);
  const merged = { ...current, ...mapped } as Record<string, unknown>;
  if (current) {
    for (const [localKey, serverKey] of Object.entries(OVERTIME_ENTRY_FIELD_MAP)) {
      if (await syncQueue.hasNewerQueuedField('overtime_entry', change.id, serverKey, EPOCH)) {
        merged[localKey] = (current as unknown as Record<string, unknown>)[localKey];
      }
    }
  }
  await writeOvertimeEntryRow(merged as unknown as OvertimeEntry, change.updated_at);
}

export async function applyRemoteOvertimeMonthMetaChange(change: SyncChange): Promise<void> {
  const yearMonth = change.id; // el server usa year_month como id de este tipo de entidad en /sync/changes
  if (change.deleted) {
    await getDb().runAsync('UPDATE overtime_month_meta SET deleted_at = ? WHERE year_month = ?', change.updated_at, yearMonth);
    return;
  }
  const current = await getOvertimeMonthMeta(yearMonth);
  const mapped = overtimeMonthMetaFromApiResponse(change.data as OvertimeMonthMetaApiResponse);
  const merged = { ...current, yearMonth } as Record<string, unknown>;
  for (const [localKey, serverKey] of Object.entries(OVERTIME_MONTH_META_FIELD_MAP)) {
    const safeToTakeRemote = !current || !(await syncQueue.hasNewerQueuedField('overtime_month_meta', yearMonth, serverKey, EPOCH));
    if (safeToTakeRemote) {
      merged[localKey] = (mapped as unknown as Record<string, unknown>)[localKey];
    }
  }
  await getDb().runAsync(
    `INSERT INTO overtime_month_meta (year_month, colaborador, cedula, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, NULL)
     ON CONFLICT(year_month) DO UPDATE SET colaborador = excluded.colaborador, cedula = excluded.cedula, updated_at = excluded.updated_at, deleted_at = NULL`,
    yearMonth,
    merged.colaborador as string,
    merged.cedula as string,
    change.updated_at
  );
}
