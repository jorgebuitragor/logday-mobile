// Versión de protocolo de sync: contrato de logday-server en
// specs/protocolo-version y en openapi.yaml ("Versión de protocolo").
//
// El protocolo es un entero que sube solo cuando cambia algo que una app
// vieja no entendería (por ejemplo, el cifrado de extremo a extremo). No
// tiene que ver con la versión de la app ni con la del servidor.
//
// Sin dependencias de React a propósito, igual que `syncEvents.ts`: lo
// usan `syncApi.ts` y las pruebas en Node.

/** Protocolo que habla esta app. Va en `X-Logday-Protocol`. */
export const CLIENT_PROTOCOL = 1;
/** Protocolo más viejo de servidor con el que esta app sabe hablar. */
export const MIN_SERVER_PROTOCOL = 1;
export const PROTOCOL_HEADER = 'X-Logday-Protocol';

export interface ServerVersionInfo {
  server_version: string;
  protocol: number;
  min_client_protocol: number;
}

/** Un servidor sin `GET /version` (anterior al contrato) habla el
 *  protocolo 1 y acepta clientes de protocolo 1. */
export const LEGACY_SERVER: ServerVersionInfo = { server_version: '', protocol: 1, min_client_protocol: 1 };

/** `appTooOld`: el servidor exige un protocolo más nuevo que el de esta
 *  app. `serverTooOld`: el servidor habla un protocolo más viejo del que
 *  esta app necesita. */
export type CompatIssue = 'appTooOld' | 'serverTooOld';

export function compatIssueFor(
  info: ServerVersionInfo,
  clientProtocol: number = CLIENT_PROTOCOL,
  minServerProtocol: number = MIN_SERVER_PROTOCOL
): CompatIssue | null {
  if (info.min_client_protocol > clientProtocol) return 'appTooOld';
  if (info.protocol < minServerProtocol) return 'serverTooOld';
  return null;
}

export class IncompatibleServerError extends Error {
  issue: CompatIssue;
  constructor(issue: CompatIssue) {
    super(issue === 'appTooOld' ? 'this app is too old for this server' : 'this server is too old for this app');
    this.issue = issue;
  }
}

// Aviso de "el servidor respondió 426": cualquier pedido de la API puede
// recibirlo (el pull del polling, una escritura de la cola), y
// `SyncContext` lo escucha para dejar de sincronizar y avisar.
type Listener = () => void;
const appTooOldListeners = new Set<Listener>();

export function onAppTooOld(listener: Listener): () => void {
  appTooOldListeners.add(listener);
  return () => {
    appTooOldListeners.delete(listener);
  };
}

export function reportAppTooOld(): void {
  for (const listener of appTooOldListeners) listener();
}
