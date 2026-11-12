import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Y from 'yjs';

import { saveAbsenceDay } from '../db/absences';
import { getDailyEntry, upsertDailyEntry } from '../db/dailyEntries';
import { getDb, initDb } from '../db/index';
import { createNote, getNote, softDeleteNote, updateNote } from '../db/notes';
import { upsertOvertimeMonthMeta } from '../db/overtime';
import { createTask, listTasks } from '../db/tasks';
import { base64ToBytes, bytesToBase64, CONTENT_KEY } from './crdtText';
import * as syncApi from './syncApi';
import type { SyncChange, SyncEntityType } from './syncApi';
import { reconcileSync } from './syncEngine';
import { isInitialUploadPending, requestInitialUpload } from './syncInitialUpload';
import { setSyncRuntime } from './syncRuntime';

// Prueba de punta a punta de la subida inicial: el código real de
// `src/db/*` sobre SQLite (`node:sqlite`, ver src/__mocks__/expo-sqlite.ts)
// contra un servidor falso en memoria que se comporta como logday-server
// en lo que importa aquí: `/sync/changes` paginado por `seq` con borrados,
// creates que fallan con 409 si el id ya existe y contenido CRDT que se
// mezcla con Yjs.

jest.mock('./syncApi', () => ({
  ...jest.requireActual<typeof import('./syncApi')>('./syncApi'),
  syncChangesRemote: jest.fn(),
  createTaskRemote: jest.fn(),
  createNoteRemote: jest.fn(),
  pushNoteContentRemote: jest.fn(),
  putDailyEntryContentRemote: jest.fn(),
  patchOvertimeMonthMetaRemote: jest.fn(),
  createAbsenceDayRemote: jest.fn(),
  createOvertimeEntryRemote: jest.fn(),
}));

interface Row {
  type: SyncEntityType;
  id: string;
  seq: number;
  deleted: boolean;
  data: Record<string, unknown>;
}

class FakeServer {
  rows = new Map<string, Row>();
  seq = 0;
  calls: string[] = [];

  put(type: SyncEntityType, id: string, data: Record<string, unknown>, deleted = false): Row {
    const row = { type, id, seq: ++this.seq, deleted, data: { ...data, seq: this.seq, updated_at: '2026-11-11T12:00:00Z' } };
    this.rows.set(`${type}:${id}`, row);
    return row;
  }

  create(type: SyncEntityType, id: string, data: Record<string, unknown>): Row {
    this.calls.push(`create ${type}:${id}`);
    if (this.rows.has(`${type}:${id}`)) throw new syncApi.SyncApiError(409, 'already exists');
    return this.put(type, id, data);
  }

  mergeContent(type: 'note' | 'daily_entry', id: string, updateB64: string, base: Record<string, unknown>): Row {
    this.calls.push(`content ${type}:${id}`);
    const current = this.rows.get(`${type}:${id}`);
    const doc = new Y.Doc();
    const prev = current?.data.content_state as string | undefined;
    if (prev) Y.applyUpdate(doc, base64ToBytes(prev));
    Y.applyUpdate(doc, base64ToBytes(updateB64));
    const data = { ...(current?.data ?? base), content: doc.getText(CONTENT_KEY).toString(), content_state: bytesToBase64(Y.encodeStateAsUpdate(doc)) };
    return this.put(type, id, data);
  }

  text(type: 'note' | 'daily_entry', id: string): string {
    return (this.rows.get(`${type}:${id}`)?.data.content as string) ?? '';
  }

  changesSince(since: number, limit = 500): SyncChange[] {
    return [...this.rows.values()]
      .filter((r) => r.seq > since)
      .sort((a, b) => a.seq - b.seq)
      .slice(0, limit)
      .map((r) => ({ type: r.type, id: r.id, seq: r.seq, deleted: r.deleted, updated_at: '2026-11-11T12:00:00Z', data: r.data }));
  }
}

let server: FakeServer;

function yState(text: string): string {
  const doc = new Y.Doc();
  doc.getText(CONTENT_KEY).insert(0, text);
  return bytesToBase64(Y.encodeStateAsUpdate(doc));
}

function wireServer(): void {
  jest.mocked(syncApi.syncChangesRemote).mockImplementation(async (_u, _t, since, limit) => server.changesSince(since, limit));
  jest.mocked(syncApi.createTaskRemote).mockImplementation(async (_u, _t, p) => server.create('task', p.id, { ...p }).data as never);
  jest.mocked(syncApi.createNoteRemote).mockImplementation(async (_u, _t, p) => server.create('note', p.id, { ...p, content: '' }).data as never);
  jest.mocked(syncApi.createAbsenceDayRemote).mockImplementation(async (_u, _t, p) => server.create('absence_day', p.id, { ...p }).data as never);
  jest.mocked(syncApi.createOvertimeEntryRemote).mockImplementation(async (_u, _t, p) => server.create('overtime_entry', p.id, { ...p }).data as never);
  jest.mocked(syncApi.patchOvertimeMonthMetaRemote).mockImplementation(async (_u, _t, ym, p) => {
    server.calls.push(`patch overtime_month_meta:${ym}`);
    return server.put('overtime_month_meta', ym, { year_month: ym, colaborador: '', cedula: '', ...p }).data as never;
  });
  jest.mocked(syncApi.pushNoteContentRemote).mockImplementation(async (_u, _t, id, update) => {
    const row = server.rows.get(`note:${id}`);
    if (!row) throw new syncApi.SyncApiError(404, 'not found');
    return server.mergeContent('note', id, update, row.data).data as never;
  });
  jest.mocked(syncApi.putDailyEntryContentRemote).mockImplementation(async (_u, _t, date, update) =>
    server.mergeContent('daily_entry', date, update, { date }).data as never
  );
}

/** Lo que hace la app al iniciar sesión: marca la subida y corre el pull. */
async function login(): Promise<void> {
  setSyncRuntime({ enabled: true, connected: true, serverUrl: 'http://servidor.test', withSyncAuth: (fn) => fn('token') });
  await requestInitialUpload();
  await reconcileSync();
}

beforeAll(async () => {
  await initDb();
});

beforeEach(async () => {
  await AsyncStorage.clear();
  const db = getDb();
  for (const table of ['tasks', 'notes', 'daily_entries', 'overtime_entries', 'overtime_month_meta', 'absence_days']) {
    await db.execAsync(`DELETE FROM ${table}`);
  }
  server = new FakeServer();
  wireServer();
  setSyncRuntime(null); // la app sin sesión: nada se encola
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('subida inicial al iniciar sesión', () => {
  it('sube todo lo creado sin sesión cuando el servidor está vacío', async () => {
    const taskId = await createTask({ title: 'tarea offline', taskCode: null, status: 'todo', tags: [], project: '', due: null, progress: null, content: '' });
    const noteId = await createNote({ title: 'nota', content: '', folder: '', tags: [] });
    await updateNote(noteId, { title: 'nota', content: 'hola desde el teléfono', folder: '', tags: [] }, { title: 'nota', content: '', folder: '', tags: [] });
    await upsertDailyEntry('2026-11-10', '- revisé el sync', '');
    await upsertOvertimeMonthMeta('2026-11', 'Ana', '123', { colaborador: '', cedula: '' });
    await saveAbsenceDay('2026-11-12', 'vacaciones', null);

    await login();

    expect(server.rows.has(`task:${taskId}`)).toBe(true);
    expect(server.text('note', noteId)).toBe('hola desde el teléfono');
    expect(server.text('daily_entry', '2026-11-10')).toBe('- revisé el sync');
    expect(server.rows.get('overtime_month_meta:2026-11')?.data).toMatchObject({ colaborador: 'Ana', cedula: '123' });
    expect([...server.rows.values()].some((r) => r.type === 'absence_day')).toBe(true);
    expect(await isInitialUploadPending()).toBe(false);
  });

  it('no vuelve a crear lo que el servidor ya tiene ni pisa sus datos', async () => {
    const taskId = await createTask({ title: 'local', taskCode: null, status: 'todo', tags: [], project: '', due: null, progress: null, content: '' });
    await upsertOvertimeMonthMeta('2026-11', 'Ana', '123', { colaborador: '', cedula: '' });
    server.put('task', taskId, { id: taskId, title: 'editada en Desktop', task_code: null, status: 'done', tags: [], project: '', created: '2026-11-01', completed_at: null, due: null, progress: null, content: '' });
    server.put('overtime_month_meta', '2026-11', { year_month: '2026-11', colaborador: 'Ana María', cedula: '999' });

    await login();

    expect(server.calls).toEqual([]);
    const tasks = await listTasks();
    expect(tasks.find((t) => t.id === taskId)?.title).toBe('editada en Desktop');
  });

  it('una nota borrada en el servidor no se resucita, y una borrada aquí no se sube', async () => {
    const vivaAqui = await createNote({ title: 'borrada allá', content: '', folder: '', tags: [] });
    await updateNote(vivaAqui, { title: 'borrada allá', content: 'texto', folder: '', tags: [] }, { title: 'borrada allá', content: '', folder: '', tags: [] });
    await upsertDailyEntry('2026-11-09', 'día borrado allá', '');
    const borradaAqui = await createNote({ title: 'borrada aquí', content: '', folder: '', tags: [] });
    await updateNote(borradaAqui, { title: 'borrada aquí', content: 'texto', folder: '', tags: [] }, { title: 'borrada aquí', content: '', folder: '', tags: [] });
    await softDeleteNote(borradaAqui);
    server.put('note', vivaAqui, { id: vivaAqui }, true);
    server.put('daily_entry', '2026-11-09', { date: '2026-11-09' }, true);

    await login();

    expect(server.calls).toEqual([]);
    expect((await getNote(vivaAqui))?.deletedAt).not.toBeNull();
    expect(await getDailyEntry('2026-11-09')).toBeNull();
  });

  it('un daily de antes del sync no se pierde cuando el servidor ya tiene ese día', async () => {
    // Fila legada: texto sin estado CRDT, como antes de la Fase 3.
    await getDb().runAsync(
      "INSERT INTO daily_entries (date, content, updated_at) VALUES ('2026-11-10', '- escrito en el teléfono', '2026-11-10')"
    );
    server.put('daily_entry', '2026-11-10', { date: '2026-11-10', content: '- escrito en Desktop', content_state: yState('- escrito en Desktop') });

    await login();

    const local = (await getDailyEntry('2026-11-10'))?.content ?? '';
    expect(local).toContain('- escrito en el teléfono');
    expect(local).toContain('- escrito en Desktop');
    expect(server.text('daily_entry', '2026-11-10')).toBe(local);
  });

  it('una nota legada sin estado CRDT sube con su texto', async () => {
    await getDb().runAsync(
      `INSERT INTO notes (id, title, folder, tags, created, updated, pinned, content, updated_at)
       VALUES ('legada', 'vieja', '', '[]', '2026-09-01', '2026-09-01', 0, 'texto de antes', '2026-09-01')`
    );
    await login();
    expect(server.text('note', 'legada')).toBe('texto de antes');
  });

  it('correrla dos veces no duplica nada', async () => {
    await createTask({ title: 't', taskCode: null, status: 'todo', tags: [], project: '', due: null, progress: null, content: '' });
    await upsertDailyEntry('2026-11-10', 'una línea', '');
    await login();
    const after = server.calls.length;
    const seq = server.seq;

    await login();

    expect(server.calls.length).toBe(after);
    expect(server.seq).toBe(seq);
    expect(server.text('daily_entry', '2026-11-10')).toBe('una línea');
  });

  it('si se corta a medias queda pendiente y termina en el próximo pull', async () => {
    await createTask({ title: 'a', taskCode: null, status: 'todo', tags: [], project: '', due: null, progress: null, content: '' });
    jest.mocked(syncApi.syncChangesRemote).mockRejectedValueOnce(new TypeError('Network request failed'));

    await login();
    expect(await isInitialUploadPending()).toBe(true);
    expect(server.rows.size).toBe(0);

    await reconcileSync();
    expect(await isInitialUploadPending()).toBe(false);
    expect(server.rows.size).toBe(1);
  });
});
