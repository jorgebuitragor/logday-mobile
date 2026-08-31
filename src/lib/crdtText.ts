import * as Y from 'yjs';

// Helpers puros de Yjs para el contenido CRDT de Note/DailyEntry —
// puerto de task-manager/src/lib/noteContentSync.ts, generalizado
// para servir a las dos entidades (el algoritmo es idéntico, solo
// cambia dónde se persiste el estado — eso vive en cada db/*.ts, no
// acá, ver specs/sync-mobile/design.md). Sin dependencias de SQLite
// a propósito: evita un ciclo de import con `db/notes.ts`/
// `db/dailyEntries.ts`, mismo motivo que separó `syncApi.ts`/
// `syncMapping.ts`/`syncQueue.ts` del resto en la Fase 2.
//
// Protocolo real (confirmado contra logday-web/src/lib/yText.ts y el
// servidor, `internal/crdt/text.go`, Go): texto plano, `Y.Text` bajo
// la key "content" — NO un documento estructurado.

/** Misma key que usa el servidor y logday-web — tiene que coincidir
 *  exactamente, Yjs no mergea shared types con nombre distinto. */
export const CONTENT_KEY = 'content';

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function getContentText(doc: Y.Doc): string {
  return doc.getText(CONTENT_KEY).toString();
}

/** Reconstruye un `Y.Doc` a partir de un snapshot persistido (base64),
 *  o crea uno nuevo vacío si no hay snapshot todavía (nota/día sin
 *  historial CRDT local — nunca se guardó, o es anterior a esta
 *  feature). */
export function docFromStateB64(stateB64: string | null): Y.Doc {
  const doc = new Y.Doc();
  if (stateB64) Y.applyUpdate(doc, base64ToBytes(stateB64));
  return doc;
}

/** Estado completo actual del doc, codificado — esto es lo que viaja
 *  como `content_update` al servidor (el nombre es un poco engañoso:
 *  es el snapshot completo, no un diff incremental — los updates de
 *  Yjs son conmutativos/idempotentes, así que reenviar el estado
 *  completo en cada guardado es seguro y más simple que llevar un log
 *  incremental, ver contentSyncQueue.ts). */
export function encodeDocStateB64(doc: Y.Doc): string {
  return bytesToBase64(Y.encodeStateAsUpdate(doc));
}

/** Aplica un update recibido (push propio ya confirmado por el
 *  servidor, o un `content_state` de otro cliente vía pull) al doc en
 *  memoria — mutación in-place, conmutativa/idempotente. */
export function applyIncomingUpdate(doc: Y.Doc, updateB64: string): void {
  Y.applyUpdate(doc, base64ToBytes(updateB64));
}

/**
 * Aplica una edición del texto plano al `Y.Text` del doc como un diff
 * mínimo (prefijo/sufijo común), no reemplazando todo el texto en
 * cada guardado — así dos ediciones concurrentes en partes distintas
 * del texto se mezclan bien en vez de pisarse. Puerto directo de
 * `applyTextEdit` de desktop (mismo algoritmo que logday-web, tiene
 * que producir las mismas operaciones Yjs para que los 3 clientes
 * mergeen igual).
 *
 * IMPORTANTE (mismo criterio que `pushDailyContentUpdate` en
 * desktop): el diff siempre se calcula contra `getContentText(doc)`
 * (el texto que el doc realmente tiene ahora), nunca contra un
 * "oldValue" capturado aparte — si el doc mergeó algo remoto entre
 * medio, diffear contra un oldValue desactualizado generaría
 * operaciones incorrectas.
 */
export function applyTextEdit(doc: Y.Doc, newValue: string): void {
  const oldValue = getContentText(doc);
  if (oldValue === newValue) return;
  const yText = doc.getText(CONTENT_KEY);

  let start = 0;
  const minLen = Math.min(oldValue.length, newValue.length);
  while (start < minLen && oldValue[start] === newValue[start]) start++;

  let oldEnd = oldValue.length;
  let newEnd = newValue.length;
  while (oldEnd > start && newEnd > start && oldValue[oldEnd - 1] === newValue[newEnd - 1]) {
    oldEnd--;
    newEnd--;
  }

  doc.transact(() => {
    if (oldEnd > start) yText.delete(start, oldEnd - start);
    if (newEnd > start) yText.insert(start, newValue.slice(start, newEnd));
  });
}
