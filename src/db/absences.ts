import { randomUUID } from 'expo-crypto';

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
    return;
  }
  await getDb().runAsync(
    'INSERT INTO absence_days (id, date, type, note, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, NULL)',
    randomUUID(),
    date,
    type,
    note,
    now
  );
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
}
