// Tiempo real contra `GET /ws` de logday-server, igual que Desktop y Web.
// El servidor solo avisa que algo cambió ({type, id, seq}, nunca el
// registro): con cada aviso se pide el delta a `/sync/changes` desde el
// cursor propio, por el mismo camino que el polling. El polling de 30 s
// sigue corriendo de respaldo (y para drenar las colas).
//
// Protocolo: el primer mensaje tiene que ser {type: "auth", token} con
// el access token (React Native puede mandar cabeceras en el handshake,
// pero el servidor autentica por mensaje porque el navegador no puede).
// Si la auth falla, el servidor cierra con 1008.
import { normalizeServerUrl } from './syncApi';

export interface RealtimeOptions {
  serverUrl: string;
  /** El access token vigente, leído en el momento de conectar. */
  getAccessToken: () => string;
  /** Llega un aviso (agrupados por NOTICE_DEBOUNCE_MS). */
  onNotice: () => void;
  /** Se cerró la conexión: antes de reconectar hay que ponerse al día
   *  con lo que no se avisó, y si la auth falló, renovar el access
   *  token. Un pull por `withSyncAuth` hace las dos cosas. */
  onReconnecting: () => Promise<void>;
}

const NOTICE_DEBOUNCE_MS = 250;
const RECONNECT_MIN_MS = 3_000;
const RECONNECT_MAX_MS = 60_000;
// Una conexión que duró al menos esto (más que un ping del servidor, que
// va cada 30 s) se considera sana: el siguiente reintento vuelve al mínimo.
const HEALTHY_CONNECTION_MS = 45_000;

let options: RealtimeOptions | null = null;
let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let noticeTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = RECONNECT_MIN_MS;

export function startRealtime(next: RealtimeOptions): void {
  options = next;
  reconnectDelay = RECONNECT_MIN_MS;
  connect();
}

export function stopRealtime(): void {
  options = null;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (noticeTimer) clearTimeout(noticeTimer);
  reconnectTimer = null;
  noticeTimer = null;
  const current = socket;
  socket = null;
  current?.close();
}

function connect(): void {
  const opts = options;
  if (!opts || socket) return;
  const url = `${normalizeServerUrl(opts.serverUrl).replace(/^http/, 'ws')}/ws`;
  const current = new WebSocket(url);
  socket = current;
  let openedAt = 0;

  current.onopen = () => {
    openedAt = Date.now();
    current.send(JSON.stringify({ type: 'auth', token: opts.getAccessToken() }));
  };
  current.onmessage = () => {
    if (noticeTimer) return;
    noticeTimer = setTimeout(() => {
      noticeTimer = null;
      options?.onNotice();
    }, NOTICE_DEBOUNCE_MS);
  };
  current.onerror = () => current.close();
  current.onclose = () => {
    // Un cierre de una conexión ya reemplazada o parada a propósito no
    // reconecta.
    if (socket !== current) return;
    socket = null;
    if (!options) return;
    if (openedAt && Date.now() - openedAt >= HEALTHY_CONNECTION_MS) reconnectDelay = RECONNECT_MIN_MS;
    const delay = reconnectDelay;
    reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX_MS);
    void options
      .onReconnecting()
      .catch(() => {})
      .finally(() => {
        if (!options || socket || reconnectTimer) return;
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          connect();
        }, delay);
      });
  };
}
