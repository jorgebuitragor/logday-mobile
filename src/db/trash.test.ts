import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Y from 'yjs';

import { base64ToBytes, bytesToBase64, CONTENT_KEY } from '../lib/crdtText';
import * as syncApi from '../lib/syncApi';
import type { SyncEntityType } from '../lib/syncApi';
import { drainContentSyncQueue, drainSyncQueue, reconcileSync } from '../lib/syncEngine';
import * as syncQueue from '../lib/syncQueue';
import { setSyncRuntime } from '../lib/syncRuntime';
import { deleteAbsenceDay, listAbsenceDays, saveAbsenceDay } from './absences';
import { getDailyEntry, softDeleteDailyEntry, upsertDailyEntry } from './dailyEntries';
import { getDb, initDb } from './index';
import { createNote, getNote, softDeleteNote, updateNote } from './notes';
import { createOvertimeEntry, getOvertimeEntry, softDeleteOvertimeEntry } from './overtime';
import { createTask, getTask, softDeleteTask } from './tasks';
import {
  autoPurgeTrash, deleteForever, emptyTrash, listTrash, purgeExpiredTrash, restoreFromTrash, setAutoPurgeEnabled,
} from './trash';

// Papelera de punta a punta: el código real de `src/db/*` sobre SQLite
// (`node:sqlite`, ver src/__mocks__/expo-sqlite.ts) contra un servidor
// falso que borra en blando como logday-server: el borrado deja la fila con
// `deleted` y no toca el CRDT, un create del mismo id la revive, un patch
// sobre una fila borrada da 404 y el contenido se mezcla con Yjs.

jest.mock('../lib/syncApi', () => {
  const actual = jest.requireActual<typeof import('../lib/syncApi')>('../lib/syncApi');
  const names = [
    'syncChangesRemote',
    'createTaskRemote', 'patchTaskRemote', 'deleteTaskRemote',
    'createNoteRemote', 'patchNoteRemote', 'deleteNoteRemote', 'pushNoteContentRemote',
    'putDailyEntryContentRemote', 'deleteDailyEntryRemote',
    'createOvertimeEntryRemote', 'patchOvertimeEntryRemote', 'deleteOvertimeEntryRemote',
    'createAbsenceDayRemote', 'patchAbsenceDayRemote', 'deleteAbsenceDayRemote',
  ];
  return { ...actual, ...Object.fromEntries(names.map((n) => [n, jest.fn()])) };
});

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

  private save(type: SyncEntityType, id: string, data: Record<string, unknown>, deleted = false): Record<string, unknown> {
    const seq = ++this.seq;
    const row: Row = { type, id, seq, deleted, data: { ...data, seq, updated_at: new Date().toISOString() } };
    this.rows.set(`${type}:${id}`, row);
    return row.data;
  }

  /** Create = upsert que revive la fila, sin tocar el contenido CRDT. */
  create(type: SyncEntityType, id: string, payload: Record<string, unknown>): Record<string, unknown> {
    this.calls.push(`create ${type}`);
    const prev = this.rows.get(`${type}:${id}`)?.data ?? {};
    const keep = type === 'note' ? { content: prev.content ?? '', content_state: prev.content_state } : {};
    return this.save(type, id, { ...prev, ...payload, ...keep });
  }

  patch(type: SyncEntityType, id: string, payload: Record<string, unknown>): Record<string, unknown> {
    this.calls.push(`patch ${type}`);
    const row = this.rows.get(`${type}:${id}`);
    if (!row || row.deleted) throw new syncApi.SyncApiError(404, 'not found');
    return this.save(type, id, { ...row.data, ...payload });
  }

  remove(type: SyncEntityType, id: string): void {
    this.calls.push(`delete ${type}`);
    const row = this.rows.get(`${type}:${id}`);
    if (!row || row.deleted) throw new syncApi.SyncApiError(404, 'not found');
    this.save(type, id, row.data, true);
  }

  /** Mezcla Yjs. El de dailys revive la fila; el de notas no (404 si está borrada). */
  content(type: 'note' | 'daily_entry', id: string, updateB64: string): Record<string, unknown> {
    this.calls.push(`content ${type}`);
    const row = this.rows.get(`${type}:${id}`);
    if (type === 'note' && (!row || row.deleted)) throw new syncApi.SyncApiError(404, 'not found');
    const doc = new Y.Doc();
    const prev = row?.data.content_state as string | undefined;
    if (prev) Y.applyUpdate(doc, base64ToBytes(prev));
    Y.applyUpdate(doc, base64ToBytes(updateB64));
    const data = { ...(row?.data ?? { date: id }), content: doc.getText(CONTENT_KEY).toString(), content_state: bytesToBase64(Y.encodeStateAsUpdate(doc)) };
    return this.save(type, id, data);
  }

  alive(type: SyncEntityType, id: string): boolean {
    const row = this.rows.get(`${type}:${id}`);
    return !!row && !row.deleted;
  }

  text(type: 'note' | 'daily_entry', id: string): string {
    return (this.rows.get(`${type}:${id}`)?.data.content as string) ?? '';
  }
}

let server: FakeServer;

function wireServer(): void {
  const m = jest.mocked(syncApi);
  m.syncChangesRemote.mockImplementation(async (_u, _t, since) =>
    [...server.rows.values()]
      .filter((r) => r.seq > since)
      .sort((a, b) => a.seq - b.seq)
      .map((r) => ({ type: r.type, id: r.id, seq: r.seq, deleted: r.deleted, updated_at: r.data.updated_at as string, data: r.data }))
  );
  m.createTaskRemote.mockImplementation(async (_u, _t, p) => server.create('task', p.id, { ...p }) as never);
  m.patchTaskRemote.mockImplementation(async (_u, _t, id, p) => server.patch('task', id, { ...p }) as never);
  m.deleteTaskRemote.mockImplementation(async (_u, _t, id) => server.remove('task', id));
  m.createNoteRemote.mockImplementation(async (_u, _t, p) => server.create('note', p.id, { ...p }) as never);
  m.patchNoteRemote.mockImplementation(async (_u, _t, id, p) => server.patch('note', id, { ...p }) as never);
  m.deleteNoteRemote.mockImplementation(async (_u, _t, id) => server.remove('note', id));
  m.pushNoteContentRemote.mockImplementation(async (_u, _t, id, u) => server.content('note', id, u) as never);
  m.putDailyEntryContentRemote.mockImplementation(async (_u, _t, date, u) => server.content('daily_entry', date, u) as never);
  m.deleteDailyEntryRemote.mockImplementation(async (_u, _t, date) => server.remove('daily_entry', date));
  m.createOvertimeEntryRemote.mockImplementation(async (_u, _t, p) => server.create('overtime_entry', p.id, { ...p }) as never);
  m.deleteOvertimeEntryRemote.mockImplementation(async (_u, _t, id) => server.remove('overtime_entry', id));
  m.createAbsenceDayRemote.mockImplementation(async (_u, _t, p) => server.create('absence_day', p.id, { ...p }) as never);
  m.deleteAbsenceDayRemote.mockImplementation(async (_u, _t, id) => server.remove('absence_day', id));
}

function online(): void {
  setSyncRuntime({ enabled: true, connected: true, serverUrl: 'http://servidor.test', withSyncAuth: (fn) => fn('token') });
}

function offline(): void {
  setSyncRuntime({ enabled: true, connected: false, serverUrl: 'http://servidor.test', withSyncAuth: (fn) => fn('token') });
}

/** Deja correr los envíos que las funciones de `src/db/*` lanzan sin esperar. */
async function settle(): Promise<void> {
  for (let i = 0; i < 30; i++) await new Promise((r) => setImmediate(r));
}

async function restore(entity: Parameters<typeof restoreFromTrash>[0], key: string) {
  const result = await restoreFromTrash(entity, key);
  await result.synced;
  return result;
}

const TASK = { title: 'tarea', taskCode: null, status: 'todo' as const, tags: ['a'], project: 'p', due: '2026-11-20', progress: 40, content: 'detalle' };
const OVERTIME = { fecha: '2026-11-10', solicitadaPor: 'Ana', actividad: 'despliegue', observaciones: '', horaInicio: '18:00', horaFinal: '20:00' };

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
  online();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('restaurar con sync', () => {
  it('tarea: create y luego patch, y vuelve viva con sus campos', async () => {
    const id = await createTask(TASK);
    await settle();
    await softDeleteTask(id);
    await settle();
    expect(await listTrash()).toEqual([expect.objectContaining({ entity: 'task', key: id, title: 'tarea' })]);

    server.calls = [];
    await restore('task', id);

    expect(server.calls).toEqual(['create task', 'patch task']);
    expect(server.alive('task', id)).toBe(true);
    expect(server.rows.get(`task:${id}`)?.data).toMatchObject({ title: 'tarea', tags: ['a'], due: '2026-11-20', progress: 40 });
    expect((await getTask(id))?.deletedAt).toBeNull();
    expect(await listTrash()).toEqual([]);
  });

  it('nota: no reenvía el contenido y el texto no se duplica', async () => {
    const id = await createNote({ title: 'nota', content: '', folder: 'f', tags: [] });
    await updateNote(id, { title: 'nota', content: 'texto único', folder: 'f', tags: [] }, { title: 'nota', content: '', folder: 'f', tags: [] });
    await settle();
    expect(server.text('note', id)).toBe('texto único');
    await softDeleteNote(id);
    await settle();

    server.calls = [];
    await restore('note', id);

    expect(server.calls).toEqual(['create note', 'patch note']);
    expect(server.alive('note', id)).toBe(true);
    expect(server.text('note', id)).toBe('texto único');
    expect((await getNote(id))?.content).toBe('texto único');
  });

  it('daily: vuelve vivo en el servidor sin duplicar el texto', async () => {
    await upsertDailyEntry('2026-11-10', '- una línea', '');
    await settle();
    await softDeleteDailyEntry('2026-11-10');
    await settle();
    expect(server.alive('daily_entry', '2026-11-10')).toBe(false);

    await restore('daily_entry', '2026-11-10');

    expect(server.alive('daily_entry', '2026-11-10')).toBe(true);
    expect(server.text('daily_entry', '2026-11-10')).toBe('- una línea');
    expect((await getDailyEntry('2026-11-10'))?.content).toBe('- una línea');
  });

  it('daily escrito y borrado sin conexión: al restaurar no se pierde el texto pendiente', async () => {
    offline();
    await upsertDailyEntry('2026-11-11', '- escrito sin red', '');
    await softDeleteDailyEntry('2026-11-11');
    await restore('daily_entry', '2026-11-11');

    online();
    await drainSyncQueue();
    await drainContentSyncQueue();

    expect(server.alive('daily_entry', '2026-11-11')).toBe(true);
    expect(server.text('daily_entry', '2026-11-11')).toBe('- escrito sin red');
  });

  it('horas extra y ausencias: un create del mismo id las revive', async () => {
    const otId = await createOvertimeEntry(OVERTIME);
    await saveAbsenceDay('2026-11-12', 'vacaciones', 'playa');
    await settle();
    const [absence] = await listAbsenceDays();
    await softDeleteOvertimeEntry(otId);
    await deleteAbsenceDay(absence.id);
    await settle();

    server.calls = [];
    await restore('overtime_entry', otId);
    await restore('absence_day', absence.id);

    expect(server.calls).toEqual(['create overtime_entry', 'create absence_day']);
    expect(server.alive('overtime_entry', otId)).toBe(true);
    expect(server.alive('absence_day', absence.id)).toBe(true);
    expect((await getOvertimeEntry(otId))?.actividad).toBe('despliegue');
  });

  it('una ausencia no se restaura si ese día ya tiene otra', async () => {
    await saveAbsenceDay('2026-11-12', 'vacaciones', null);
    const [first] = await listAbsenceDays();
    await deleteAbsenceDay(first.id);
    await saveAbsenceDay('2026-11-12', 'incapacidad', null);

    const result = await restore('absence_day', first.id);

    expect(result).toMatchObject({ restored: false, dateTaken: true });
    expect(await listAbsenceDays()).toHaveLength(1);
    expect((await listTrash()).map((i) => i.key)).toEqual([first.id]);
  });

  it('un borrado que no alcanzó a salir se cancela y no vuelve a borrar lo restaurado', async () => {
    const id = await createTask(TASK);
    await settle();
    offline();
    await softDeleteTask(id);
    await settle();
    expect(await syncQueue.queueLength()).toBe(1);

    online();
    await restore('task', id);
    await drainSyncQueue();

    expect(server.calls).not.toContain('delete task');
    expect(server.alive('task', id)).toBe(true);
    expect(await syncQueue.queueLength()).toBe(0);
  });

  it('sin conexión, create y patch quedan en cola en ese orden y salen al reconectar', async () => {
    const id = await createTask(TASK);
    await settle();
    await softDeleteTask(id);
    await settle();
    offline();
    await restore('task', id);
    expect(server.alive('task', id)).toBe(false);

    online();
    await drainSyncQueue();

    expect(server.calls.slice(-2)).toEqual(['create task', 'patch task']);
    expect(server.alive('task', id)).toBe(true);
  });

  it('lo borrado en otro cliente llega a la papelera y se puede restaurar', async () => {
    const id = await createTask(TASK);
    await settle();
    server.remove('task', id);
    await reconcileSync();

    expect((await listTrash()).map((i) => i.key)).toEqual([id]);
    await restore('task', id);
    expect(server.alive('task', id)).toBe(true);
  });
});

describe('borrar mientras viaja la escritura', () => {
  it.each(['task', 'note', 'overtime_entry', 'absence_day'] as const)('%s: la respuesta del create no lo revive', async (entity) => {
    let key: string;
    if (entity === 'task') {
      key = await createTask(TASK);
      await softDeleteTask(key);
    } else if (entity === 'note') {
      key = await createNote({ title: 'n', content: '', folder: '', tags: [] });
      await softDeleteNote(key);
    } else if (entity === 'overtime_entry') {
      key = await createOvertimeEntry(OVERTIME);
      await softDeleteOvertimeEntry(key);
    } else {
      await saveAbsenceDay('2026-11-13', 'otro', null);
      key = (await getDb().getFirstAsync<{ id: string }>("SELECT id FROM absence_days WHERE date = '2026-11-13'"))!.id;
      await deleteAbsenceDay(key);
    }
    await settle();
    expect((await listTrash()).map((i) => i.key)).toContain(key);
  });

  it('tarea: tampoco cuando la respuesta llega después del borrado', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    jest.mocked(syncApi.createTaskRemote).mockImplementationOnce(async (_u, _t, p) => {
      const data = server.create('task', p.id, { ...p });
      await gate;
      return data as never;
    });
    const id = await createTask(TASK);
    await settle();
    await softDeleteTask(id);
    release();
    await settle();
    expect((await getTask(id))?.deletedAt).not.toBeNull();
  });

  it('daily: la respuesta del envío de contenido no lo revive', async () => {
    await upsertDailyEntry('2026-11-14', '- algo', '');
    await softDeleteDailyEntry('2026-11-14');
    await settle();
    expect(await getDailyEntry('2026-11-14')).toBeNull();
  });
});

describe('vista, eliminar para siempre y purga', () => {
  async function deletedAt(table: string, column: string, key: string, iso: string): Promise<void> {
    await getDb().runAsync(`UPDATE ${table} SET deleted_at = ? WHERE ${column} = ?`, iso, key);
  }

  it('no muestra notas descartadas vacías ni dailys sin texto', async () => {
    const empty = await createNote({ title: '', content: '', folder: '', tags: [] });
    await softDeleteNote(empty);
    await upsertDailyEntry('2026-11-09', '', 'x');
    await softDeleteDailyEntry('2026-11-09');
    expect(await listTrash()).toEqual([]);
  });

  it('el daily muestra su primera línea con texto y la lista va de lo más reciente a lo más viejo', async () => {
    const id = await createTask(TASK);
    await upsertDailyEntry('2026-11-08', '\n  - primera\n- segunda', '');
    await softDeleteTask(id);
    await softDeleteDailyEntry('2026-11-08');
    await deletedAt('tasks', 'id', id, '2026-11-01T00:00:00Z');

    const items = await listTrash();
    expect(items.map((i) => [i.entity, i.title])).toEqual([['daily_entry', '- primera'], ['task', 'tarea']]);
  });

  it('eliminar para siempre borra solo lo que está en la papelera', async () => {
    const vivo = await createTask(TASK);
    const borrado = await createTask(TASK);
    await softDeleteTask(borrado);
    await deleteForever('task', vivo);
    await deleteForever('task', borrado);
    expect(await getTask(vivo)).not.toBeNull();
    expect(await getTask(borrado)).toBeNull();
  });

  it('vaciar borra todo lo que está en la papelera', async () => {
    const a = await createTask(TASK);
    const b = await createNote({ title: 'n', content: '', folder: '', tags: [] });
    const c = await createTask(TASK);
    await softDeleteTask(a);
    await softDeleteNote(b);
    await emptyTrash();
    expect(await getTask(a)).toBeNull();
    expect(await getNote(b)).toBeNull();
    expect(await getTask(c)).not.toBeNull();
  });

  it('la purga borra lo de más de 60 días y respeta el interruptor', async () => {
    const now = Date.parse('2026-11-11T12:00:00Z');
    const viejo = await createTask(TASK);
    const reciente = await createTask(TASK);
    const otViejo = await createOvertimeEntry(OVERTIME);
    await softDeleteTask(viejo);
    await softDeleteTask(reciente);
    await softDeleteOvertimeEntry(otViejo);
    await deletedAt('tasks', 'id', viejo, '2026-09-01T00:00:00Z');
    await deletedAt('tasks', 'id', reciente, '2026-10-20T00:00:00Z');
    await deletedAt('overtime_entries', 'id', otViejo, '2026-09-11T11:00:00.000Z');

    expect(await purgeExpiredTrash(now)).toBe(2);
    expect(await getTask(viejo)).toBeNull();
    expect(await getOvertimeEntry(otViejo)).toBeNull();
    expect(await getTask(reciente)).not.toBeNull();

    await deletedAt('tasks', 'id', reciente, '2020-01-01T00:00:00Z');
    await setAutoPurgeEnabled(false);
    expect(await autoPurgeTrash()).toBe(0);
    expect(await getTask(reciente)).not.toBeNull();
    await setAutoPurgeEnabled(true);
    expect(await autoPurgeTrash()).toBe(1);
  });
});
