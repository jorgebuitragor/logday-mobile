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

// Agrega una columna a una tabla ya existente si todavía no la tiene.
// `PRAGMA table_info` en vez de `ALTER TABLE` + capturar el error de
// columna duplicada: expo-sqlite no distingue ese error de cualquier otro
// fallo de SQL por código, así que comprobar antes es más seguro que
// confiar en el mensaje. Hoy solo la usa la migración 1, que tiene que
// servir también a las instalaciones de antes de `user_version`.
async function ensureColumn(table: string, column: string, type: string): Promise<void> {
  const columns = await getDb().getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  if (columns.some((c) => c.name === column)) return;
  await getDb().execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
}

/** Migraciones numeradas. La posición en la lista es el número: la base
 *  guarda en `PRAGMA user_version` cuántas ya corrió, y `initDb` corre las
 *  que falten, en orden, cada una en su transacción junto con el nuevo
 *  `user_version`. Si una falla, la base queda en la anterior y se
 *  reintenta al abrir otra vez.
 *
 *  Reglas: nunca editar ni reordenar una migración ya publicada; los
 *  cambios nuevos van al final. La 1 es idempotente a propósito: es el
 *  esquema que ya tenían las instalaciones previas (versión 0, con o sin
 *  las columnas de `ensureColumn`) y también crea una base nueva. */
export const MIGRATIONS: readonly (() => Promise<void>)[] = [
  // 1: esquema base (SCHEMA_SQL) más las columnas que antes agregaba
  // `ensureColumn` al abrir.
  async () => {
    await getDb().execAsync(SCHEMA_SQL);
    // Fase 3 del sync (specs/sync-mobile/): estado CRDT (Yjs) del
    // contenido de Notes/Dailys, guardado como snapshot base64.
    await ensureColumn('notes', 'content_state', 'TEXT');
    await ensureColumn('daily_entries', 'content_state', 'TEXT');
    // Progreso opcional de las tareas (specs/progreso-tasks/): entero
    // 0–100 o NULL = sin progreso. Sin DEFAULT, para que las tareas que
    // ya existían queden sin progreso y no en 0. Sin CHECK: la validación
    // vive en `src/lib/taskProgress.ts`, y lo que llega del servidor pasa
    // por `progressFromServer` antes de escribirse.
    await ensureColumn('tasks', 'progress', 'INTEGER');
  },
];

// Se resuelve cuando `initDb` termina. `SyncProvider` envuelve a la pantalla
// que llama `initDb`, así que el sync puede arrancar antes de que existan
// las tablas o mientras corre una migración: `syncEngine` espera esto.
let markDbReady: () => void = () => {};
const dbReady = new Promise<void>((resolve) => {
  markDbReady = resolve;
});

export function whenDbReady(): Promise<void> {
  return dbReady;
}

async function userVersion(): Promise<number> {
  const row = await getDb().getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

export async function initDb(): Promise<void> {
  // WAL: cada escritura fuera de una transacción deja de reescribir el
  // journal completo (en el modo por defecto, DELETE, cuesta varias
  // escrituras a disco), y leer no bloquea a escribir. Es lo que más
  // pesa en un full resync de miles de cambios. Queda guardado en el
  // archivo de la base.
  await getDb().execAsync('PRAGMA journal_mode = WAL');
  const current = await userVersion();
  if (current > MIGRATIONS.length) {
    // Una versión más nueva de la app ya migró esta base. No se toca:
    // abrirla igual podría leer columnas con otro significado.
    throw new Error(`database schema version ${current} is newer than this app (${MIGRATIONS.length})`);
  }
  for (let version = current + 1; version <= MIGRATIONS.length; version++) {
    await getDb().withTransactionAsync(async () => {
      await MIGRATIONS[version - 1]();
      // PRAGMA no acepta parámetros; `version` es un entero nuestro.
      await getDb().execAsync(`PRAGMA user_version = ${version}`);
    });
  }
  markDbReady();
}

export async function countRows(table: string): Promise<number> {
  const row = await getDb().getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM ${table} WHERE deleted_at IS NULL`
  );
  return row?.count ?? 0;
}
