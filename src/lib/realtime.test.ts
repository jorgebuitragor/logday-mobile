import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { isOwnWriteSeq, recordOwnWriteSeq } from './ownWrites';
import { startRealtime, stopRealtime } from './realtime';

// Un WebSocket falso: guarda las instancias para poder abrirlas y
// mandarles mensajes desde la prueba.
class FakeSocket {
  static instances: FakeSocket[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  sent: string[] = [];
  constructor(public url: string) {
    FakeSocket.instances.push(this);
  }
  send(data: string): void {
    this.sent.push(data);
  }
  close(): void {}
  receive(data: unknown): void {
    this.onmessage?.({ data });
  }
}

const onNotice = jest.fn<(seqs: (number | null)[]) => void>();

function start(): FakeSocket {
  startRealtime({
    serverUrl: 'https://servidor.test',
    getAccessToken: () => 'token',
    onNotice,
    onReconnecting: () => Promise.resolve(),
  });
  const socket = FakeSocket.instances[FakeSocket.instances.length - 1];
  socket.onopen?.();
  return socket;
}

beforeEach(() => {
  jest.useFakeTimers();
  FakeSocket.instances = [];
  onNotice.mockReset();
  (global as { WebSocket?: unknown }).WebSocket = FakeSocket;
});

afterEach(() => {
  stopRealtime();
  jest.useRealTimers();
});

describe('realtime', () => {
  it('se autentica con el primer mensaje', () => {
    const socket = start();
    expect(socket.url).toBe('wss://servidor.test/ws');
    expect(JSON.parse(socket.sent[0])).toEqual({ type: 'auth', token: 'token' });
  });

  it('usa ws:// hacia la red local y no abre el socket hacia un servidor público por http://', () => {
    const options = { getAccessToken: () => 'token', onNotice, onReconnecting: () => Promise.resolve() };
    startRealtime({ ...options, serverUrl: '192.168.1.10:8080' });
    expect(FakeSocket.instances.map((s) => s.url)).toEqual(['ws://192.168.1.10:8080/ws']);
    stopRealtime();

    startRealtime({ ...options, serverUrl: 'http://servidor.test' });
    expect(FakeSocket.instances).toHaveLength(1);
  });

  it('junta una ráfaga de avisos en un solo onNotice con todos sus seq', () => {
    const socket = start();
    socket.receive(JSON.stringify({ type: 'task', id: 'a', seq: 5 }));
    socket.receive(JSON.stringify({ type: 'note', id: 'b', seq: 6 }));
    socket.receive('no es JSON');
    expect(onNotice).not.toHaveBeenCalled();

    jest.advanceTimersByTime(250);
    expect(onNotice).toHaveBeenCalledTimes(1);
    expect(onNotice).toHaveBeenCalledWith([5, 6, null]);

    socket.receive(JSON.stringify({ type: 'task', id: 'a', seq: 7 }));
    jest.advanceTimersByTime(250);
    expect(onNotice).toHaveBeenLastCalledWith([7]);
  });

  it('al parar descarta los avisos que esperaban', () => {
    const socket = start();
    socket.receive(JSON.stringify({ seq: 5 }));
    stopRealtime();
    jest.advanceTimersByTime(250);
    expect(onNotice).not.toHaveBeenCalled();

    const next = start();
    next.receive(JSON.stringify({ seq: 9 }));
    jest.advanceTimersByTime(250);
    expect(onNotice).toHaveBeenCalledWith([9]);
  });

  it('al abrir olvida los seq propios de la sesión anterior', () => {
    recordOwnWriteSeq(3);
    start();
    expect(isOwnWriteSeq(3)).toBe(false);
  });
});
