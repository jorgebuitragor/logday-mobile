// Cliente HTTP hacia logday-server — puerto de task-manager/src/lib/
// sync.ts, funciones de auth/dispositivos (las de entidad se agregan
// en cada fase que las necesite, ver specs/sync-mobile/). Desktop usa
// un comando Tauri (`syncRequest`, Rust) porque su webview no tiene
// `fetch` de confianza para CORS/certificados de servidores locales —
// React Native no tiene ese problema, usa `fetch` nativo directo.

export class SyncApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Antepone http:// si el usuario no escribió un esquema — mismo
 *  criterio que desktop (`normalizeServerUrl`), la razón es la misma:
 *  tipear algo como "192.168.1.10:8080" sin esquema es lo natural. */
export function normalizeServerUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, '');
  return /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
}

async function request<T>(
  baseUrl: string,
  method: string,
  path: string,
  opts?: { token?: string; body?: unknown }
): Promise<T> {
  const res = await fetch(`${normalizeServerUrl(baseUrl)}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(opts?.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new SyncApiError(res.status, text || `HTTP ${res.status}`);
  }
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  device_id: string;
}

export function login(
  baseUrl: string,
  email: string,
  password: string,
  deviceName?: string
): Promise<TokenResponse> {
  return request<TokenResponse>(baseUrl, 'POST', '/auth/login', {
    body: { email, password, device_name: deviceName },
  });
}

export function refreshToken(baseUrl: string, refreshTokenValue: string): Promise<TokenResponse> {
  return request<TokenResponse>(baseUrl, 'POST', '/auth/refresh', {
    body: { refresh_token: refreshTokenValue },
  });
}

export interface DeviceResponse {
  id: string;
  device_name: string;
  created_at: string;
  last_used_at: string;
}

export function listDevicesRemote(baseUrl: string, token: string): Promise<DeviceResponse[]> {
  return request(baseUrl, 'GET', '/devices', { token });
}
