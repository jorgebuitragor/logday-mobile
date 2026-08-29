import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

import { SCHEMA_SQL } from './schema';

const DB_NAME = 'logday.db';

let db: SQLiteDatabase | null = null;

export function getDb(): SQLiteDatabase {
  if (!db) {
    db = openDatabaseSync(DB_NAME);
  }
  return db;
}

export async function initDb(): Promise<void> {
  await getDb().execAsync(SCHEMA_SQL);
}

export async function countRows(table: string): Promise<number> {
  const row = await getDb().getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM ${table} WHERE deleted_at IS NULL`
  );
  return row?.count ?? 0;
}
