import type { DailyEntry } from '../types/dailyEntry';
import { getDb } from './index';

interface DailyEntryRow {
  date: string;
  content: string;
  updated_at: string;
  deleted_at: string | null;
}

function rowToDailyEntry(row: DailyEntryRow): DailyEntry {
  return {
    date: row.date,
    content: row.content,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export async function listDailyEntries(): Promise<DailyEntry[]> {
  const rows = await getDb().getAllAsync<DailyEntryRow>(
    "SELECT * FROM daily_entries WHERE deleted_at IS NULL AND content != '' ORDER BY date DESC"
  );
  return rows.map(rowToDailyEntry);
}

export async function getDailyEntry(date: string): Promise<DailyEntry | null> {
  const row = await getDb().getFirstAsync<DailyEntryRow>(
    'SELECT * FROM daily_entries WHERE date = ? AND deleted_at IS NULL',
    date
  );
  return row ? rowToDailyEntry(row) : null;
}

/** Upsert — mismo patrón que el servidor (`PUT /daily-entries/:date`, sin POST separado). */
export async function upsertDailyEntry(date: string, content: string): Promise<void> {
  const now = new Date().toISOString();
  await getDb().runAsync(
    `INSERT INTO daily_entries (date, content, updated_at, deleted_at)
     VALUES (?, ?, ?, NULL)
     ON CONFLICT(date) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at, deleted_at = NULL`,
    date,
    content,
    now
  );
}

export async function softDeleteDailyEntry(date: string): Promise<void> {
  const now = new Date().toISOString();
  await getDb().runAsync('UPDATE daily_entries SET deleted_at = ? WHERE date = ?', now, date);
}
