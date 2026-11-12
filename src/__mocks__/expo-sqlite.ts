// Mock automático de Jest para `expo-sqlite` (módulo nativo): la misma API
// asíncrona que usa la app, sobre el SQLite que trae Node (`node:sqlite`,
// Node ≥ 22.13 sin bandera). Cada `openDatabaseSync` abre una base nueva
// en memoria, así que cada archivo de pruebas arranca vacío. Solo cubre
// los métodos que usa `src/db/*`.
import type { DatabaseSync, SQLInputValue } from 'node:sqlite';

type Param = string | number | boolean | null | undefined | Uint8Array;

const { DatabaseSync: NodeDatabase } = process.getBuiltinModule('node:sqlite') as typeof import('node:sqlite');

function toSqlite(params: Param[]): SQLInputValue[] {
  // expo-sqlite acepta booleanos y `undefined`; node:sqlite no.
  return params.map((p) => (typeof p === 'boolean' ? (p ? 1 : 0) : p === undefined ? null : p));
}

function flatten(params: (Param | Param[])[]): Param[] {
  return params.length === 1 && Array.isArray(params[0]) ? params[0] : (params as Param[]);
}

export class SQLiteDatabase {
  constructor(private readonly db: DatabaseSync) {}

  async execAsync(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async runAsync(sql: string, ...params: (Param | Param[])[]): Promise<{ lastInsertRowId: number; changes: number }> {
    const r = this.db.prepare(sql).run(...toSqlite(flatten(params)));
    return { lastInsertRowId: Number(r.lastInsertRowid), changes: Number(r.changes) };
  }

  async getAllAsync<T>(sql: string, ...params: (Param | Param[])[]): Promise<T[]> {
    return this.db.prepare(sql).all(...toSqlite(flatten(params))) as T[];
  }

  async getFirstAsync<T>(sql: string, ...params: (Param | Param[])[]): Promise<T | null> {
    return (this.db.prepare(sql).get(...toSqlite(flatten(params))) as T | undefined) ?? null;
  }

  async withTransactionAsync(task: () => Promise<void>): Promise<void> {
    this.db.exec('BEGIN');
    try {
      await task();
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }
}

export function openDatabaseSync(): SQLiteDatabase {
  return new SQLiteDatabase(new NodeDatabase(':memory:'));
}
