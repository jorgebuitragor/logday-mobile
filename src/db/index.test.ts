import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// Cada prueba importa `./index` de cero (`jest.resetModules`), así que
// cada una tiene su propia base en memoria (ver src/__mocks__/expo-sqlite.ts).
async function freshDb() {
  return jest.requireActual<typeof import('./index')>('./index');
}

beforeEach(() => {
  jest.resetModules();
});

describe('initDb', () => {
  it('crea una base nueva con todas las tablas y deja user_version en la última migración', async () => {
    const { getDb, initDb, MIGRATIONS } = await freshDb();
    await initDb();
    const version = await getDb().getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    expect(version?.user_version).toBe(MIGRATIONS.length);
    const tables = (await getDb().getAllAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table'")).map((t) => t.name);
    expect(tables).toEqual(expect.arrayContaining(['tasks', 'notes', 'daily_entries', 'overtime_entries', 'absence_days']));
    const taskColumns = (await getDb().getAllAsync<{ name: string }>('PRAGMA table_info(tasks)')).map((c) => c.name);
    expect(taskColumns).toContain('progress');
  });

  it('migra una base de antes de user_version sin perder filas', async () => {
    const { getDb, initDb } = await freshDb();
    // Una instalación vieja: tasks sin `progress`, notes sin `content_state`.
    await getDb().execAsync(`
      CREATE TABLE tasks (id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, task_code TEXT,
        status TEXT NOT NULL, tags TEXT NOT NULL DEFAULT '[]', project TEXT NOT NULL DEFAULT '',
        created TEXT NOT NULL, completed_at TEXT, due TEXT, content TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL, deleted_at TEXT);
      CREATE TABLE notes (id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, folder TEXT NOT NULL DEFAULT '',
        tags TEXT NOT NULL DEFAULT '[]', content TEXT NOT NULL DEFAULT '', created TEXT NOT NULL,
        updated TEXT NOT NULL, pinned INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL, deleted_at TEXT);
      INSERT INTO tasks (id, title, status, created, updated_at) VALUES ('t1', 'vieja', 'todo', '2026-10-01', '2026-10-01T00:00:00Z');
    `);
    await initDb();
    const row = await getDb().getFirstAsync<{ title: string; progress: number | null }>('SELECT title, progress FROM tasks WHERE id = ?', 't1');
    expect(row).toEqual({ title: 'vieja', progress: null });
    const noteColumns = (await getDb().getAllAsync<{ name: string }>('PRAGMA table_info(notes)')).map((c) => c.name);
    expect(noteColumns).toContain('content_state');
  });

  it('abrir dos veces no vuelve a correr las migraciones', async () => {
    const { getDb, initDb, MIGRATIONS } = await freshDb();
    await initDb();
    await getDb().runAsync("INSERT INTO tasks (id, title, status, created, updated_at) VALUES ('t1', 'a', 'todo', 'x', 'y')");
    await initDb();
    expect(await getDb().getFirstAsync('SELECT id FROM tasks')).toEqual({ id: 't1' });
    const version = await getDb().getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    expect(version?.user_version).toBe(MIGRATIONS.length);
  });

  it('no abre una base migrada por una versión más nueva de la app', async () => {
    const { getDb, initDb } = await freshDb();
    await getDb().execAsync('PRAGMA user_version = 999');
    await expect(initDb()).rejects.toThrow(/newer than this app/);
  });

  it('whenDbReady se resuelve cuando termina initDb', async () => {
    const { initDb, whenDbReady } = await freshDb();
    let ready = false;
    void whenDbReady().then(() => {
      ready = true;
    });
    await Promise.resolve();
    expect(ready).toBe(false);
    await initDb();
    await Promise.resolve();
    expect(ready).toBe(true);
  });
});
