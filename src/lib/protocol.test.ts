import { describe, expect, it, jest } from '@jest/globals';

import { compatIssueFor, LEGACY_SERVER, onAppTooOld, PROTOCOL_HEADER } from './protocol';
import { getServerVersionRemote, isPermanentSyncError, listDevicesRemote, SyncApiError } from './syncApi';

const BASE = 'https://logday.example.com';

function mockFetch(status: number, body: string) {
  const fetchMock = jest.fn(async (..._args: unknown[]) => ({ ok: status >= 200 && status < 300, status, text: async () => body }));
  (globalThis as { fetch: unknown }).fetch = fetchMock;
  return fetchMock;
}

describe('compatIssueFor', () => {
  it('sin problema cuando los dos protocolos alcanzan', () => {
    expect(compatIssueFor({ server_version: 'v1', protocol: 1, min_client_protocol: 1 }, 1, 1)).toBeNull();
    expect(compatIssueFor({ server_version: 'v2', protocol: 2, min_client_protocol: 1 }, 1, 1)).toBeNull();
  });

  it('appTooOld cuando el servidor exige un protocolo más nuevo que el de la app', () => {
    expect(compatIssueFor({ server_version: 'v3', protocol: 2, min_client_protocol: 2 }, 1, 1)).toBe('appTooOld');
  });

  it('serverTooOld cuando el servidor habla menos de lo que la app necesita', () => {
    expect(compatIssueFor({ server_version: 'v1', protocol: 1, min_client_protocol: 1 }, 2, 2)).toBe('serverTooOld');
  });

  it('un servidor anterior al contrato es compatible con esta app', () => {
    expect(compatIssueFor(LEGACY_SERVER)).toBeNull();
  });
});

describe('syncApi y el protocolo', () => {
  it('manda X-Logday-Protocol en cada pedido', async () => {
    const fetchMock = mockFetch(200, '[]');
    await listDevicesRemote(BASE, 'tok');
    const init = (fetchMock.mock.calls[0] as unknown[])[1] as { headers: Record<string, string> };
    expect(init.headers[PROTOCOL_HEADER]).toBe('1');
  });

  it('un 426 avisa a los oyentes y no se descarta de la cola', async () => {
    mockFetch(426, 'this app is too old for this server, update it');
    const listener = jest.fn();
    const off = onAppTooOld(listener);
    let error: unknown;
    try {
      await listDevicesRemote(BASE, 'tok');
    } catch (e) {
      error = e;
    }
    off();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(error).toBeInstanceOf(SyncApiError);
    expect((error as SyncApiError).status).toBe(426);
    expect(isPermanentSyncError(error)).toBe(false);
  });

  it('GET /version devuelve lo que publica el servidor', async () => {
    mockFetch(200, JSON.stringify({ server_version: 'v1.3.0', protocol: 2, min_client_protocol: 1 }));
    await expect(getServerVersionRemote(BASE)).resolves.toEqual({ server_version: 'v1.3.0', protocol: 2, min_client_protocol: 1 });
  });

  it('un servidor sin GET /version (404) cuenta como protocolo 1', async () => {
    mockFetch(404, '404 page not found');
    await expect(getServerVersionRemote(BASE)).resolves.toEqual(LEGACY_SERVER);
  });

  it('una respuesta de /version sin los protocolos es un error', async () => {
    mockFetch(200, JSON.stringify({ server_version: 'x' }));
    await expect(getServerVersionRemote(BASE)).rejects.toBeInstanceOf(SyncApiError);
  });
});
