import { randomUUID } from 'expo-crypto';

import { calcOvertimeBreakdown } from '../lib/overtimeCalc';
import type { OvertimeEntry } from '../types/overtime';
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
  return id;
}

export async function updateOvertimeEntry(id: string, input: OvertimeInput): Promise<void> {
  const now = new Date().toISOString();
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
}

export async function softDeleteOvertimeEntry(id: string): Promise<void> {
  const now = new Date().toISOString();
  await getDb().runAsync('UPDATE overtime_entries SET deleted_at = ? WHERE id = ?', now, id);
}
