import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { applyRemoteTaskChange } from '../db/tasks';
import { SyncApiError, syncChangesRemote, type SyncChange } from './syncApi';
import { reconcileSync } from './syncEngine';
import { setSyncRuntime } from './syncRuntime';

jest.mock('./syncApi', () => ({
  ...jest.requireActual<typeof import('./syncApi')>('./syncApi'),
  syncChangesRemote: jest.fn(),
}));
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

const fetchPage = jest.mocked(syncChangesRemote);
const applyTask = jest.mocked(applyRemoteTaskChange);

function taskChanges(fromSeq: number, count: number): SyncChange[] {
  return Array.from({ length: count }, (_, i) => ({
    type: 'task' as const,
    id: `t${fromSeq + i}`,
    seq: fromSeq + i,
    deleted: false,
    updated_at: '2026-11-11T12:00:00Z',
    data: {},
  }));
}

/** Servidor falso con `total` cambios de task, seq 1..total, que respeta
 *  `since` y `limit` como logday-server. */
function serverWith(total: number): void {
  const all = taskChanges(1, total);
  fetchPage.mockImplementation(async (_url, _token, since, limit) => all.filter((c) => c.seq > since).slice(0, limit));
}

async function cursor(): Promise<number> {
  return Number((await AsyncStorage.getItem('syncCursor')) || '0');
}

beforeEach(async () => {
  await AsyncStorage.clear();
  fetchPage.mockReset();
  applyTask.mockReset();
  applyTask.mockResolvedValue(undefined);
  setSyncRuntime({ enabled: true, connected: true, serverUrl: 'http://servidor.test', withSyncAuth: (fn) => fn('token') });
});

describe('reconcileSync', () => {
  it('aplica todas las páginas en orden y deja el cursor en el último seq', async () => {
    serverWith(1203);
    await reconcileSync();
    expect(fetchPage.mock.calls.map((c) => c[2])).toEqual([0, 500, 1000]);
    expect(applyTask).toHaveBeenCalledTimes(1203);
    expect(applyTask.mock.calls.map((c) => c[0].seq)).toEqual(Array.from({ length: 1203 }, (_, i) => i + 1));
    expect(await cursor()).toBe(1203);
  });

  it('si falla una página, el cursor queda en lo ya aplicado y el próximo pull sigue desde ahí', async () => {
    serverWith(1203);
    applyTask.mockImplementation(async (c) => {
      if (c.seq === 700) throw new Error('la app se cerró');
    });
    await reconcileSync();
    expect(await cursor()).toBe(500);

    applyTask.mockReset();
    applyTask.mockResolvedValue(undefined);
    await reconcileSync();
    expect(applyTask.mock.calls[0][0].seq).toBe(501);
    expect(await cursor()).toBe(1203);
  });

  it('con un 410 vuelve a traer todo desde 0', async () => {
    await AsyncStorage.setItem('syncCursor', '9999');
    const all = taskChanges(1, 3);
    fetchPage.mockImplementation(async (_url, _token, since) => {
      if (since === 9999) throw new SyncApiError(410, 'cursor invalid');
      return all.filter((c) => c.seq > since);
    });
    await reconcileSync();
    expect(applyTask).toHaveBeenCalledTimes(3);
    expect(await cursor()).toBe(3);
  });

  it('sin cambios no toca el cursor', async () => {
    await AsyncStorage.setItem('syncCursor', '42');
    serverWith(42);
    await reconcileSync();
    expect(await cursor()).toBe(42);
    expect(applyTask).not.toHaveBeenCalled();
  });

  it('varios pedidos con un pull en curso se juntan en un solo pull más', async () => {
    serverWith(3);
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => {
      release = r;
    });
    fetchPage.mockImplementationOnce(async () => {
      await gate;
      return taskChanges(1, 3);
    });
    const first = reconcileSync();
    const others = [reconcileSync(), reconcileSync(), reconcileSync()];
    release();
    await Promise.all([first, ...others]);
    // El primero, y uno solo más por los tres pedidos que llegaron en medio.
    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(applyTask).toHaveBeenCalledTimes(3);
    expect(await cursor()).toBe(3);
  });

  it('un error de red no rechaza la promesa', async () => {
    fetchPage.mockRejectedValue(new TypeError('Network request failed'));
    await expect(reconcileSync()).resolves.toBeUndefined();
  });
});
