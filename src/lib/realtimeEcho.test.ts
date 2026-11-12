import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { clearOwnWriteSeqs, isOwnWriteSeq, recordOwnWriteSeq } from './ownWrites';
import { patchTaskRemote, syncChangesRemote } from './syncApi';
import { handleRealtimeNotices } from './syncEngine';
import { setSyncRuntime } from './syncRuntime';

// A-10: un aviso de `/ws` que el teléfono ya conoce (su propio eco, o un
// `seq` que el cursor ya cubrió) no pide `/sync/changes`.

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

const fetchMock = jest.fn<typeof fetch>();

function respondWith(body: unknown): void {
  fetchMock.mockResolvedValue(new Response(body === undefined ? '' : JSON.stringify(body), { status: body === undefined ? 204 : 200 }));
}

/** Cuántas veces se pidió `/sync/changes`. */
function pulls(): number {
  return fetchMock.mock.calls.filter(([url]) => String(url).includes('/sync/changes')).length;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  clearOwnWriteSeqs();
  fetchMock.mockReset();
  respondWith([]);
  global.fetch = fetchMock;
  setSyncRuntime({ enabled: true, connected: true, serverUrl: 'https://servidor.test', withSyncAuth: (fn) => fn('token') });
});

afterEach(() => {
  setSyncRuntime(null);
});

describe('seq de las escrituras propias', () => {
  it('una escritura que devuelve la entidad anota su seq', async () => {
    respondWith({ id: 't1', seq: 41 });
    await patchTaskRemote('https://servidor.test', 'token', 't1', { title: 'x', updated_at: '2026-11-11T12:00:00Z' });
    expect(isOwnWriteSeq(41)).toBe(true);
  });

  it('una lectura no anota nada, aunque traiga seq', async () => {
    respondWith([{ type: 'task', id: 't1', seq: 42, deleted: false, updated_at: '', data: {} }]);
    await syncChangesRemote('https://servidor.test', 'token', 0, 500);
    expect(isOwnWriteSeq(42)).toBe(false);
  });

  it('guarda solo los últimos 200', () => {
    for (let seq = 1; seq <= 201; seq++) recordOwnWriteSeq(seq);
    expect(isOwnWriteSeq(1)).toBe(false);
    expect(isOwnWriteSeq(2)).toBe(true);
    expect(isOwnWriteSeq(201)).toBe(true);
  });
});

describe('handleRealtimeNotices', () => {
  it('el eco de una escritura propia no dispara un pull', async () => {
    recordOwnWriteSeq(10);
    await handleRealtimeNotices([10]);
    expect(pulls()).toBe(0);
  });

  it('un seq que el cursor ya cubrió no dispara un pull', async () => {
    await AsyncStorage.setItem('syncCursor', '20');
    await handleRealtimeNotices([15, 20]);
    expect(pulls()).toBe(0);
  });

  it('un cambio de otro cliente dispara el pull desde el cursor', async () => {
    await AsyncStorage.setItem('syncCursor', '20');
    recordOwnWriteSeq(21);
    await handleRealtimeNotices([21, 22]);
    expect(pulls()).toBe(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('since=20');
  });

  it('un aviso sin seq legible dispara el pull', async () => {
    await handleRealtimeNotices([null]);
    expect(pulls()).toBe(1);
  });
});
