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

// Agrega una columna a una tabla ya existente si todavía no la tiene
// — primera migración real de este esquema (todos los cambios
// anteriores fueron tablas nuevas, que `CREATE TABLE IF NOT EXISTS`
// ya cubre solo). `PRAGMA table_info` en vez de `ALTER TABLE` +
// capturar el error de columna duplicada: expo-sqlite no distingue
// ese error de cualquier otro fallo de SQL por código, así que
// comprobar antes es más seguro que confiar en el mensaje.
async function ensureColumn(table: string, column: string, type: string): Promise<void> {
  const columns = await getDb().getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  if (columns.some((c) => c.name === column)) return;
  await getDb().execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
}

export async function initDb(): Promise<void> {
  await getDb().execAsync(SCHEMA_SQL);
  // Fase 3 del sync (specs/sync-mobile/): estado CRDT (Yjs) del
  // contenido de Notes/Dailys, guardado como snapshot base64 —
  // columna nueva en tablas que ya existían en instalaciones previas.
  await ensureColumn('notes', 'content_state', 'TEXT');
  await ensureColumn('daily_entries', 'content_state', 'TEXT');
}

export async function countRows(table: string): Promise<number> {
  const row = await getDb().getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM ${table} WHERE deleted_at IS NULL`
  );
  return row?.count ?? 0;
}
