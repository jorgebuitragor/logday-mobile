import { randomUUID } from 'expo-crypto';

import { diffChangedFields } from '../lib/objectDiff';
import { absenceDayFieldsToPatchPayload, absenceDayFromApiResponse, absenceDayToCreatePayload, ABSENCE_DAY_FIELD_MAP, type AbsenceDayApiResponse } from '../lib/syncMapping';
import { createAbsenceDayRemote, deleteAbsenceDayRemote, patchAbsenceDayRemote, SyncApiError, type SyncChange } from '../lib/syncApi';
import * as syncQueue from '../lib/syncQueue';
import { getSyncRuntime } from '../lib/syncRuntime';
import type { AbsenceDay, AbsenceType } from '../types/absence';
import { getDb } from './index';

interface AbsenceDayRow {
  id: string;
  date: string;
  type: AbsenceType;
  note: string | null;
  updated_at: string;
  deleted_at: string | null;
}

function rowToAbsenceDay(row: AbsenceDayRow): AbsenceDay {
  return {
    id: row.id,
    date: row.date,
    type: row.type,
    note: row.note,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export async function listAbsenceDays(): Promise<AbsenceDay[]> {
  const rows = await getDb().getAllAsync<AbsenceDayRow>(
    'SELECT * FROM absence_days WHERE deleted_at IS NULL ORDER BY date DESC'
  );
  return rows.map(rowToAbsenceDay);
}

export async function getAbsenceDayByDate(date: string): Promise<AbsenceDay | null> {
  const row = await getDb().getFirstAsync<AbsenceDayRow>(
    'SELECT * FROM absence_days WHERE date = ? AND deleted_at IS NULL',
    date
  );
  return row ? rowToAbsenceDay(row) : null;
}

async function getAbsenceDay(id: string): Promise<AbsenceDay | null> {
  const row = await getDb().getFirstAsync<AbsenceDayRow>('SELECT * FROM absence_days WHERE id = ?', id);
  return row ? rowToAbsenceDay(row) : null;
}

// Mismo criterio que `AbsenceModal`/`saveAbsenceDay` de desktop:
// "buscar por fecha, editar en el lugar si ya existe" en vez de un
// UNIQUE de base de datos — no hay más de una ausencia activa por
// fecha, pero esa regla vive en la capa de la app, no en el esquema
// (igual que el resto de "enums" de este proyecto, ver
// esquema-datos/design.md).
export async function saveAbsenceDay(date: string, type: AbsenceType, note: string | null): Promise<void> {
  const now = new Date().toISOString();
  const existing = await getAbsenceDayByDate(date);
  if (existing) {
    await getDb().runAsync(
      'UPDATE absence_days SET type = ?, note = ?, updated_at = ? WHERE id = ?',
      type,
      note,
      now,
      existing.id
    );
    const next: AbsenceDay = { ...existing, type, note, updatedAt: now };
    const changed = diffChangedFields(existing, next, ['type', 'note']);
    void syncPatchAbsenceDay(existing.id, changed);
    return;
  }
  const id = randomUUID();
  await getDb().runAsync(
    'INSERT INTO absence_days (id, date, type, note, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, NULL)',
    id,
    date,
    type,
    note,
    now
  );
  void syncCreateAbsenceDay({ id, date, type, note, updatedAt: now, deletedAt: null });
}

// Puerto de `saveAbsenceDayRange` de desktop — un `AbsenceDay` por
// fecha del rango (inclusive), no una fila con fecha de inicio/fin.
export async function saveAbsenceDayRange(
  startDate: string,
  endDate: string,
  type: AbsenceType,
  note: string | null
): Promise<void> {
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  for (let cursor = start; cursor.getTime() <= end.getTime(); cursor.setDate(cursor.getDate() + 1)) {
    const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
    await saveAbsenceDay(iso, type, note);
  }
}

export async function deleteAbsenceDay(id: string): Promise<void> {
  const now = new Date().toISOString();
  await getDb().runAsync('UPDATE absence_days SET deleted_at = ? WHERE id = ?', now, id);
  void syncDeleteAbsenceDay(id);
}

// ── Sync (logday-server) ──────────────────────────────────────────
// Mismo patrón y mismo motivo de ubicación que en db/tasks.ts (ver el
// comentario ahí) — evita un ciclo de import entre este archivo y
// syncEngine.ts.

async function syncCreateAbsenceDay(absence: AbsenceDay): Promise<void> {
  const runtime = getSyncRuntime();
  if (!runtime?.enabled) return;
  const payload = absenceDayToCreatePayload(absence);
  if (!runtime.connected) {
    await syncQueue.enqueue('absence_day', absence.id, 'create', payload as unknown as Record<string, unknown>);
    return;
  }
  try {
    const response = await runtime.withSyncAuth((token) => createAbsenceDayRemote(runtime.serverUrl, token, payload));
    await applyAbsenceDayResponse(absence.id, new Date().toISOString(), response);
  } catch {
    await syncQueue.enqueue('absence_day', absence.id, 'create', payload as unknown as Record<string, unknown>);
  }
}

async function syncPatchAbsenceDay(id: string, fields: Partial<AbsenceDay>): Promise<void> {
  const runtime = getSyncRuntime();
  if (!runtime?.enabled || Object.keys(fields).length === 0) return;
  const payload = absenceDayFieldsToPatchPayload(fields);
  const queuedAt = new Date().toISOString();
  if (!runtime.connected) {
    await syncQueue.enqueue('absence_day', id, 'patch', payload as unknown as Record<string, unknown>);
    return;
  }
  try {
    const response = await runtime.withSyncAuth((token) => patchAbsenceDayRemote(runtime.serverUrl, token, id, payload));
    await applyAbsenceDayResponse(id, queuedAt, response);
  } catch (e) {
    if (e instanceof SyncApiError && e.status === 404) return;
    await syncQueue.enqueue('absence_day', id, 'patch', payload as unknown as Record<string, unknown>);
  }
}

async function syncDeleteAbsenceDay(id: string): Promise<void> {
  const runtime = getSyncRuntime();
  if (!runtime?.enabled) return;
  if (!runtime.connected) {
    await syncQueue.enqueue('absence_day', id, 'delete');
    return;
  }
  try {
    await runtime.withSyncAuth((token) => deleteAbsenceDayRemote(runtime.serverUrl, token, id));
  } catch (e) {
    if (e instanceof SyncApiError && e.status === 404) return;
    await syncQueue.enqueue('absence_day', id, 'delete');
  }
}

async function writeAbsenceDayRow(absence: AbsenceDay, updatedAt: string): Promise<void> {
  await getDb().runAsync(
    `INSERT INTO absence_days (id, date, type, note, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, NULL)
     ON CONFLICT(id) DO UPDATE SET date = excluded.date, type = excluded.type, note = excluded.note, updated_at = excluded.updated_at, deleted_at = NULL`,
    absence.id,
    absence.date,
    absence.type,
    absence.note,
    updatedAt
  );
}

export async function applyAbsenceDayResponse(id: string, sinceIso: string, response: AbsenceDayApiResponse): Promise<void> {
  const current = await getAbsenceDay(id);
  if (!current) return;
  const mapped = absenceDayFromApiResponse(response);
  const merged = { ...current } as Record<string, unknown>;
  for (const [localKey, serverKey] of Object.entries(ABSENCE_DAY_FIELD_MAP)) {
    if (!(await syncQueue.hasNewerQueuedField('absence_day', id, serverKey, sinceIso))) {
      merged[localKey] = (mapped as unknown as Record<string, unknown>)[localKey];
    }
  }
  await writeAbsenceDayRow(merged as unknown as AbsenceDay, response.updated_at);
}

const EPOCH = '0000-01-01T00:00:00.000Z';

export async function applyRemoteAbsenceDayChange(change: SyncChange): Promise<void> {
  if (change.deleted) {
    await getDb().runAsync('UPDATE absence_days SET deleted_at = ? WHERE id = ?', change.updated_at, change.id);
    return;
  }
  const current = await getAbsenceDay(change.id);
  const mapped = absenceDayFromApiResponse(change.data as AbsenceDayApiResponse);
  const merged = { ...current, ...mapped } as Record<string, unknown>;
  if (current) {
    for (const [localKey, serverKey] of Object.entries(ABSENCE_DAY_FIELD_MAP)) {
      if (await syncQueue.hasNewerQueuedField('absence_day', change.id, serverKey, EPOCH)) {
        merged[localKey] = (current as unknown as Record<string, unknown>)[localKey];
      }
    }
  }
  await writeAbsenceDayRow(merged as unknown as AbsenceDay, change.updated_at);
}
