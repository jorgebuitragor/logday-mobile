import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

import * as contentSyncQueue from './contentSyncQueue';
import { SyncApiError } from './syncApi';
import { drainContentSyncQueue, drainSyncQueue } from './syncEngine';
import * as syncQueue from './syncQueue';
import { setSyncRuntime } from './syncRuntime';

// Los `apply*` de `src/db/*` escriben en SQLite; aquí solo importa qué pasa
// con la cola, no la fila local. La base se da por lista.
jest.mock('../db/index', () => ({ whenDbReady: () => Promise.resolve() }));
jest.mock('../db/absences', () => ({ applyAbsenceDayResponse: jest.fn(), applyRemoteAbsenceDayChange: jest.fn() }));
jest.mock('../db/dailyEntries', () => ({ applyRemoteDailyEntryChange: jest.fn() }));
jest.mock('../db/notes', () => ({ applyNoteResponse: jest.fn(), applyRemoteNoteChange: jest.fn() }));
jest.mock('../db/overtime', () => ({
  applyOvertimeEntryResponse: jest.fn(),
  applyOvertimeMonthMetaResponse: jest.fn(),
  applyRemoteOvertimeEntryChange: jest.fn(),
  applyRemoteOvertimeMonthMetaChange: jest.fn(),
}));
jest.mock('../db/tasks', () => ({ applyTaskResponse: jest.fn(), applyRemoteTaskChange: jest.fn() }));

/** Simula un servidor que responde siempre `status` a cualquier escritura. */
function connectedRuntimeFailingWith(status: number): void {
  setSyncRuntime({
    enabled: true,
    connected: true,
    serverUrl: 'https://servidor.test',
    withSyncAuth: () => Promise.reject(new SyncApiError(status, `HTTP ${status}`)),
  });
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('drainSyncQueue', () => {
  it.each([401, 408, 429, 500, 503])('un %i deja la escritura en cola', async (status) => {
    connectedRuntimeFailingWith(status);
    await syncQueue.enqueue('task', 't1', 'create', { title: 'hecha sin conexión' });
    await syncQueue.enqueue('task', 't1', 'patch', { status: 'done' });
    await drainSyncQueue();
    expect(await syncQueue.queueLength()).toBe(2);
  });

  it.each([400, 404, 409, 422])('un %i descarta la escritura y sigue con las demás', async (status) => {
    connectedRuntimeFailingWith(status);
    await syncQueue.enqueue('task', 't1', 'patch', { title: 'a' });
    await syncQueue.enqueue('note', 'n1', 'delete');
    await drainSyncQueue();
    expect(await syncQueue.queueLength()).toBe(0);
  });

  it('sin conexión no toca la cola', async () => {
    setSyncRuntime({ enabled: true, connected: false, serverUrl: '', withSyncAuth: () => Promise.reject(new Error('no')) });
    await syncQueue.enqueue('task', 't1', 'delete');
    await drainSyncQueue();
    expect(await syncQueue.queueLength()).toBe(1);
  });
});

describe('drainContentSyncQueue', () => {
  it('un 401 deja el contenido en cola', async () => {
    connectedRuntimeFailingWith(401);
    await contentSyncQueue.enqueue('note', 'n1', 'estado');
    await drainContentSyncQueue();
    expect(await contentSyncQueue.queueLength()).toBe(1);
  });

  it('un 404 descarta el contenido', async () => {
    connectedRuntimeFailingWith(404);
    await contentSyncQueue.enqueue('note', 'n1', 'estado');
    await drainContentSyncQueue();
    expect(await contentSyncQueue.queueLength()).toBe(0);
  });
});
