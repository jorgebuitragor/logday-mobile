import AsyncStorage from '@react-native-async-storage/async-storage';

import { emitRemoteChange } from '../lib/syncEvents';
import type { RestoreResult } from '../lib/syncRestore';
import type { AbsenceType } from '../types/absence';
import { restoreAbsenceDay } from './absences';
import { restoreDailyEntry } from './dailyEntries';
import { getDb } from './index';
import { restoreNote } from './notes';
import { restoreOvertimeEntry } from './overtime';
import { restoreTask } from './tasks';

// Papelera (specs/papelera/). Mobile ya borraba en blando: cada tabla
// tiene `deleted_at` y la fila completa queda en SQLite, también cuando el
// borrado llega de otro cliente por el pull. La papelera es una vista de
// esas filas, con restaurar (ver src/lib/syncRestore.ts), eliminar para
// siempre (borra la fila local; en el servidor sigue como tombstone, igual
// que en Desktop y Web) y una purga automática a los 60 días.

export type TrashEntity = 'task' | 'note' | 'daily_entry' | 'overtime_entry' | 'absence_day';

export interface TrashItem {
  entity: TrashEntity;
  /** id, o la fecha para los dailys. */
  key: string;
  deletedAt: string;
  /** Lo que la pantalla muestra; el formato final lo pone ella. */
  title: string;
  /** Fecha de la ausencia o de la entrada de horas extra. */
  date?: string;
  absenceType?: AbsenceType;
}

const TABLES: Record<TrashEntity, { table: string; key: string }> = {
  task: { table: 'tasks', key: 'id' },
  note: { table: 'notes', key: 'id' },
  daily_entry: { table: 'daily_entries', key: 'date' },
  overtime_entry: { table: 'overtime_entries', key: 'id' },
  absence_day: { table: 'absence_days', key: 'id' },
};

// Lo que no se muestra: una nota que se descartó vacía al salir del editor
// (`app/note/[id].tsx`) y un daily sin texto no son algo que alguien quiera
// recuperar. Siguen contando para vaciar y para la purga.
const VISIBLE: Record<TrashEntity, string> = {
  task: 'SELECT id AS key, title, deleted_at FROM tasks WHERE deleted_at IS NOT NULL',
  note: "SELECT id AS key, title, deleted_at FROM notes WHERE deleted_at IS NOT NULL AND (title != '' OR content != '')",
  daily_entry: "SELECT date AS key, content AS title, deleted_at FROM daily_entries WHERE deleted_at IS NOT NULL AND content != ''",
  overtime_entry: 'SELECT id AS key, actividad AS title, fecha AS date, deleted_at FROM overtime_entries WHERE deleted_at IS NOT NULL',
  absence_day: 'SELECT id AS key, note AS title, date, type AS absence_type, deleted_at FROM absence_days WHERE deleted_at IS NOT NULL',
};

interface TrashRow {
  key: string;
  title: string | null;
  date?: string;
  absence_type?: AbsenceType;
  deleted_at: string;
}

/** Todo lo borrado, lo más reciente primero. */
export async function listTrash(): Promise<TrashItem[]> {
  const items: TrashItem[] = [];
  for (const entity of Object.keys(VISIBLE) as TrashEntity[]) {
    const rows = await getDb().getAllAsync<TrashRow>(VISIBLE[entity]);
    for (const r of rows) {
      items.push({
        entity,
        key: r.key,
        deletedAt: r.deleted_at,
        title: entity === 'daily_entry' ? firstLine(r.title ?? '') : (r.title ?? ''),
        date: r.date,
        absenceType: r.absence_type,
      });
    }
  }
  // Por fecha y no por texto: `deleted_at` viene del teléfono o del
  // servidor, con o sin milisegundos.
  return items.sort((a, b) => Date.parse(b.deletedAt) - Date.parse(a.deletedAt));
}

function firstLine(text: string): string {
  return text.split('\n').map((l) => l.trim()).find((l) => l !== '') ?? '';
}

export type RestoreOutcome = RestoreResult & { dateTaken?: boolean };

/** Restaura y avisa a las pantallas abiertas (las mismas que recargan con
 *  el pull, ver `useReloadOnRemoteChange`). */
export async function restoreFromTrash(entity: TrashEntity, key: string): Promise<RestoreOutcome> {
  const result = await restoreLocal(entity, key);
  if (result.restored) emitRemoteChange(entity, key);
  return result;
}

function restoreLocal(entity: TrashEntity, key: string): Promise<RestoreOutcome> {
  switch (entity) {
    case 'task':
      return restoreTask(key);
    case 'note':
      return restoreNote(key);
    case 'daily_entry':
      return restoreDailyEntry(key);
    case 'overtime_entry':
      return restoreOvertimeEntry(key);
    case 'absence_day':
      return restoreAbsenceDay(key);
  }
}

/** Borra la fila local de algo que está en la papelera. Nunca toca lo que
 *  no está borrado. */
export async function deleteForever(entity: TrashEntity, key: string): Promise<void> {
  const { table, key: column } = TABLES[entity];
  await getDb().runAsync(`DELETE FROM ${table} WHERE ${column} = ? AND deleted_at IS NOT NULL`, key);
}

export async function emptyTrash(): Promise<void> {
  for (const { table } of Object.values(TABLES)) {
    await getDb().runAsync(`DELETE FROM ${table} WHERE deleted_at IS NOT NULL`);
  }
}

// ── Purga automática ───────────────────────────────────────────────

export const TRASH_RETENTION_DAYS = 60;
const AUTO_PURGE_KEY = 'trashAutoPurge';

/** Encendida por omisión, igual que Desktop y Web. Cada cliente decide la
 *  suya: no se sincroniza. */
export async function isAutoPurgeEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(AUTO_PURGE_KEY)) !== 'false';
}

export async function setAutoPurgeEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(AUTO_PURGE_KEY, String(enabled));
}

/** Borra lo que lleva más de `TRASH_RETENTION_DAYS` en la papelera.
 *  Devuelve cuántas filas borró. */
export async function purgeExpiredTrash(now: number = Date.now()): Promise<number> {
  const cutoff = now - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  let purged = 0;
  for (const { table, key } of Object.values(TABLES)) {
    const rows = await getDb().getAllAsync<{ k: string; deleted_at: string }>(
      `SELECT ${key} AS k, deleted_at FROM ${table} WHERE deleted_at IS NOT NULL`
    );
    for (const r of rows) {
      const when = Date.parse(r.deleted_at);
      if (Number.isFinite(when) && when < cutoff) {
        await getDb().runAsync(`DELETE FROM ${table} WHERE ${key} = ? AND deleted_at IS NOT NULL`, r.k);
        purged += 1;
      }
    }
  }
  return purged;
}

/** La llama la app al abrir, si la purga está encendida. */
export async function autoPurgeTrash(): Promise<number> {
  if (!(await isAutoPurgeEnabled())) return 0;
  return purgeExpiredTrash();
}
