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
