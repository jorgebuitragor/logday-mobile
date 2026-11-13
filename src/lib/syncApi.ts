// Cliente HTTP hacia logday-server — puerto de task-manager/src/lib/
// sync.ts, funciones de auth/dispositivos (las de entidad se agregan
// en cada fase que las necesite, ver specs/sync-mobile/). Desktop usa
// un comando Tauri (`syncRequest`, Rust) porque su webview no tiene
// `fetch` de confianza para CORS/certificados de servidores locales —
// React Native no tiene ese problema, usa `fetch` nativo directo.
import type {
  AbsenceDayCreatePayload, AbsenceDayApiResponse, AbsenceDayPatchPayload,
  DailyEntryApiResponse,
  NoteCreatePayload, NoteApiResponse, NotePatchPayload,
  OvertimeEntryCreatePayload, OvertimeEntryApiResponse, OvertimeEntryPatchPayload,
  OvertimeMonthMetaApiResponse, OvertimeMonthMetaPatchPayload,
  TaskCreatePayload, TaskApiResponse, TaskPatchPayload,
} from './syncMapping';
import { recordOwnWriteSeq } from './ownWrites';
import { CLIENT_PROTOCOL, LEGACY_SERVER, PROTOCOL_HEADER, reportAppTooOld, type ServerVersionInfo } from './protocol';
import { resolveServerUrl } from './serverUrl';

export class SyncApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Error que no se arregla reintentando el mismo envío: un 4xx (payload
 *  inválido, entidad que no existe en el servidor). Se excluyen 401
 *  (sesión vencida: al reconectar el envío vuelve a servir), 408, 429 y
 *  426 (app demasiado vieja para el servidor: el envío tiene que esperar
 *  en la cola a que se actualice la app, no descartarse). */
export function isPermanentSyncError(e: unknown): boolean {
  return e instanceof SyncApiError && e.status >= 400 && e.status < 500 && ![401, 408, 426, 429].includes(e.status);
}

async function request<T>(
  baseUrl: string,
  method: string,
  path: string,
  opts?: { token?: string; body?: unknown }
): Promise<T> {
  const res = await fetch(`${resolveServerUrl(baseUrl)}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      [PROTOCOL_HEADER]: String(CLIENT_PROTOCOL),
      ...(opts?.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  if (res.status === 426) reportAppTooOld();
  if (!res.ok) {
    throw new SyncApiError(res.status, text || `HTTP ${res.status}`);
  }
  const body = text ? (JSON.parse(text) as T) : (undefined as T);
  // Toda escritura que devuelve la entidad trae su `seq`: se anota para
  // reconocer el eco de `/ws` (ver ownWrites.ts).
  const seq = (body as { seq?: unknown } | undefined)?.seq;
  if (method !== 'GET' && typeof seq === 'number') recordOwnWriteSeq(seq);
  return body;
}

/** `GET /version` (sin autenticación). Un servidor sin el endpoint
 *  (`404`) es anterior al contrato y habla el protocolo 1. */
export async function getServerVersionRemote(baseUrl: string): Promise<ServerVersionInfo> {
  try {
    const info = await request<Partial<ServerVersionInfo> | undefined>(baseUrl, 'GET', '/version');
    if (typeof info?.protocol !== 'number' || typeof info.min_client_protocol !== 'number') {
      throw new SyncApiError(502, 'invalid /version response');
    }
    return { server_version: info.server_version ?? '', protocol: info.protocol, min_client_protocol: info.min_client_protocol };
  } catch (e) {
    if (e instanceof SyncApiError && e.status === 404) return LEGACY_SERVER;
    throw e;
  }
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  device_id: string;
  policy_version: number;
  policy_accepted_version: number | null;
  sensitive_data_accepted: boolean;
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

// Revoca este dispositivo en el servidor (POST /auth/logout). El
// servidor lo revoca aunque el refresh token ya se haya rotado en un
// refresh en vuelo, y desde ese momento el access token tampoco sirve.
export function logoutRemote(baseUrl: string, refreshTokenValue: string): Promise<void> {
  return request<void>(baseUrl, 'POST', '/auth/logout', {
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

export function revokeDeviceRemote(baseUrl: string, token: string, id: string): Promise<void> {
  return request(baseUrl, 'DELETE', `/devices/${id}`, { token });
}

// ── Política de tratamiento de datos + derechos del titular ─────────
// Ver specs/cumplimiento-datos-personales/ (task-manager). getPolicyRemote
// es pública (sin token) a propósito.

export interface PolicyResponse {
  text: string;
  version: number;
}

export function getPolicyRemote(baseUrl: string): Promise<PolicyResponse> {
  return request(baseUrl, 'GET', '/policy');
}

export function acceptPolicyRemote(baseUrl: string, token: string, version: number): Promise<void> {
  return request(baseUrl, 'POST', '/policy/accept', { token, body: { version } });
}

export function acceptSensitiveDataRemote(baseUrl: string, token: string): Promise<void> {
  return request(baseUrl, 'POST', '/policy/accept-sensitive', { token });
}

export function exportAccountRemote(baseUrl: string, token: string): Promise<unknown> {
  return request(baseUrl, 'GET', '/account/export', { token });
}

export function deleteAccountRemote(baseUrl: string, token: string, password: string): Promise<void> {
  return request(baseUrl, 'DELETE', '/account', { token, body: { password } });
}

// ─── Delta de cambios ───

export type SyncEntityType = 'task' | 'overtime_entry' | 'overtime_month_meta' | 'absence_day' | 'note' | 'daily_entry';

export interface SyncChange {
  type: SyncEntityType;
  id: string;
  seq: number;
  deleted: boolean;
  updated_at: string;
  data: unknown; // fila completa de la entidad, shape = *ApiResponse de syncMapping.ts
}

/** since=0 trae el historial completo — se usa tanto para el pull
 *  incremental normal como para el full resync tras un cursor
 *  inválido (410). `limit` es opcional — sin él el servidor devuelve
 *  todo el delta en una sola respuesta; con límite, una página
 *  completa (length === limit) puede no ser la última. */
export function syncChangesRemote(baseUrl: string, token: string, since: number, limit?: number): Promise<SyncChange[]> {
  const query = limit ? `?since=${since}&limit=${limit}` : `?since=${since}`;
  return request(baseUrl, 'GET', `/sync/changes${query}`, { token });
}

// ─── Task ───

export function createTaskRemote(baseUrl: string, token: string, payload: TaskCreatePayload): Promise<TaskApiResponse> {
  return request(baseUrl, 'POST', '/tasks', { token, body: payload });
}
export function patchTaskRemote(baseUrl: string, token: string, id: string, payload: TaskPatchPayload): Promise<TaskApiResponse> {
  return request(baseUrl, 'PATCH', `/tasks/${id}`, { token, body: payload });
}
export function deleteTaskRemote(baseUrl: string, token: string, id: string): Promise<void> {
  return request(baseUrl, 'DELETE', `/tasks/${id}`, { token });
}

// ─── OvertimeEntry ───

export function createOvertimeEntryRemote(baseUrl: string, token: string, payload: OvertimeEntryCreatePayload): Promise<OvertimeEntryApiResponse> {
  return request(baseUrl, 'POST', '/overtime-entries', { token, body: payload });
}
export function patchOvertimeEntryRemote(baseUrl: string, token: string, id: string, payload: OvertimeEntryPatchPayload): Promise<OvertimeEntryApiResponse> {
  return request(baseUrl, 'PATCH', `/overtime-entries/${id}`, { token, body: payload });
}
export function deleteOvertimeEntryRemote(baseUrl: string, token: string, id: string): Promise<void> {
  return request(baseUrl, 'DELETE', `/overtime-entries/${id}`, { token });
}

// ─── OvertimeMonthMeta ───
// Sin POST — el primer PATCH crea si no existe (ver internal/overtime
// de logday-server).

export function patchOvertimeMonthMetaRemote(baseUrl: string, token: string, yearMonth: string, payload: OvertimeMonthMetaPatchPayload): Promise<OvertimeMonthMetaApiResponse> {
  return request(baseUrl, 'PATCH', `/overtime-month-meta/${yearMonth}`, { token, body: payload });
}

// ─── AbsenceDay ───

export function createAbsenceDayRemote(baseUrl: string, token: string, payload: AbsenceDayCreatePayload): Promise<AbsenceDayApiResponse> {
  return request(baseUrl, 'POST', '/absence-days', { token, body: payload });
}
export function patchAbsenceDayRemote(baseUrl: string, token: string, id: string, payload: AbsenceDayPatchPayload): Promise<AbsenceDayApiResponse> {
  return request(baseUrl, 'PATCH', `/absence-days/${id}`, { token, body: payload });
}
export function deleteAbsenceDayRemote(baseUrl: string, token: string, id: string): Promise<void> {
  return request(baseUrl, 'DELETE', `/absence-days/${id}`, { token });
}

// ─── Note (metadata) ───

export function createNoteRemote(baseUrl: string, token: string, payload: NoteCreatePayload): Promise<NoteApiResponse> {
  return request(baseUrl, 'POST', '/notes', { token, body: payload });
}
export function patchNoteRemote(baseUrl: string, token: string, id: string, payload: NotePatchPayload): Promise<NoteApiResponse> {
  return request(baseUrl, 'PATCH', `/notes/${id}`, { token, body: payload });
}
export function deleteNoteRemote(baseUrl: string, token: string, id: string): Promise<void> {
  return request(baseUrl, 'DELETE', `/notes/${id}`, { token });
}

// ─── Note (contenido, CRDT) ───
// Canal separado del PATCH de metadata de arriba (LWW) — el body va
// como `content_update` (no `update`), y la respuesta es la fila
// completa de la nota (mismo shape que create/patch): el servidor
// mergea el update Yjs (nunca lo rechaza por antigüedad, los updates
// conmutan) y devuelve el `content`/`content_state` ya resultante.
export function pushNoteContentRemote(baseUrl: string, token: string, id: string, updateB64: string): Promise<NoteApiResponse> {
  return request(baseUrl, 'POST', `/notes/${id}/content`, {
    token,
    body: { content_update: updateB64, updated_at: new Date().toISOString() },
  });
}

// ─── DailyEntry (contenido, CRDT) ───
// PUT-only (natural key = date, sin POST) — mismo patrón que
// pushNoteContentRemote.

export function putDailyEntryContentRemote(baseUrl: string, token: string, date: string, updateB64: string): Promise<DailyEntryApiResponse> {
  return request(baseUrl, 'PUT', `/daily-entries/${date}`, {
    token,
    body: { content_update: updateB64, updated_at: new Date().toISOString() },
  });
}
export function deleteDailyEntryRemote(baseUrl: string, token: string, date: string): Promise<void> {
  return request(baseUrl, 'DELETE', `/daily-entries/${date}`, { token });
}
