import diff from 'fast-diff';
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

// ── Diff y traslación de ediciones ────────────────────────────────
// Puerto de `noteContentSync.ts` (task-manager, PR jorgebuitragor/logday#3
// y #8). Mismo algoritmo para que los clientes generen las mismas
// operaciones Yjs ante la misma edición.

/** Un cambio sobre un texto, en coordenadas del texto original: en
 *  `index` se borran `deleteCount` caracteres y se inserta `insert`. */
export interface TextChange {
  index: number;
  deleteCount: number;
  insert: string;
}

/** `fast-diff` puede agotar la pila con surrogates UTF-16 sueltos. Un
 *  guardado nunca debe fallar por eso: en ese caso se cae a una sola
 *  ventana prefijo/sufijo, peor para el merge pero siempre termina. */
function safeDiff(oldValue: string, newValue: string): diff.Diff[] {
  try {
    return diff(oldValue, newValue);
  } catch {
    let start = 0;
    const minLen = Math.min(oldValue.length, newValue.length);
    while (start < minLen && oldValue[start] === newValue[start]) start++;
    let oldEnd = oldValue.length;
    let newEnd = newValue.length;
    while (oldEnd > start && newEnd > start && oldValue[oldEnd - 1] === newValue[newEnd - 1]) {
      oldEnd--;
      newEnd--;
    }
    const result: diff.Diff[] = [[diff.EQUAL, oldValue.slice(0, start)]];
    if (oldEnd > start) result.push([diff.DELETE, oldValue.slice(start, oldEnd)]);
    if (newEnd > start) result.push([diff.INSERT, newValue.slice(start, newEnd)]);
    result.push([diff.EQUAL, oldValue.slice(oldEnd)]);
    return result.filter(([, text]) => text.length > 0);
  }
}

/** Cambios para pasar de `oldValue` a `newValue`, ordenados y sin
 *  solaparse. Diff real (Myers, vía `fast-diff`) y no una sola ventana
 *  prefijo/sufijo: con la ventana, si el primer y el último carácter
 *  difieren, el "diff mínimo" degenera en borrar todo y reinsertar todo,
 *  y el texto concurrente de otro cliente queda anclado a caracteres
 *  borrados (bug real en desktop, 19 oct 2026). */
function diffChanges(oldValue: string, newValue: string): TextChange[] {
  const changes: TextChange[] = [];
  let index = 0;
  for (const [op, text] of safeDiff(oldValue, newValue)) {
    if (op === diff.EQUAL) {
      index += text.length;
    } else if (op === diff.DELETE) {
      changes.push({ index, deleteCount: text.length, insert: '' });
      index += text.length;
    } else {
      // Un borrado seguido de una inserción en el mismo punto es un reemplazo.
      const last = changes[changes.length - 1];
      if (last && last.insert === '' && last.index + last.deleteCount === index) last.insert = text;
      else changes.push({ index, deleteCount: 0, insert: text });
    }
  }
  return changes;
}

/** Aplica `changes` (en coordenadas del texto actual del `Y.Text`) en
 *  una sola transacción, de atrás hacia adelante para que los índices
 *  de los anteriores sigan valiendo. En un reemplazo se inserta antes de
 *  borrar: el texto nuevo queda anclado a su vecino izquierdo y no
 *  detrás de las lápidas de lo borrado. */
function applyChanges(doc: Y.Doc, changes: TextChange[]): void {
  if (changes.length === 0) return;
  const yText = doc.getText(CONTENT_KEY);
  doc.transact(() => {
    for (let i = changes.length - 1; i >= 0; i -= 1) {
      const { index, deleteCount, insert } = changes[i];
      if (insert) yText.insert(index, insert);
      if (deleteCount > 0) yText.delete(index + insert.length, deleteCount);
    }
  });
}

/**
 * Lleva el `Y.Text` del doc a `newValue` con un diff de verdad (no
 * reemplazando todo el texto). El diff se calcula contra
 * `getContentText(doc)`, así que borra todo lo que el doc tenga y
 * `newValue` no — incluido lo que llegó de otro cliente. Para guardar lo
 * que escribió el usuario en un editor usar `applyEditorEdit`, que solo
 * aplica su delta.
 */
export function applyTextEdit(doc: Y.Doc, newValue: string): void {
  const oldValue = getContentText(doc);
  if (oldValue === newValue) return;
  applyChanges(doc, diffChanges(oldValue, newValue));
}

/** Tramo de la alineación entre dos textos: `[base, base + baseLen)` del
 *  primero corresponde a `[current, current + currentLen)` del segundo.
 *  `equal` indica si son el mismo texto carácter a carácter. */
interface AlignedSpan {
  base: number;
  baseLen: number;
  current: number;
  currentLen: number;
  equal: boolean;
}

function alignTexts(baseValue: string, currentValue: string): AlignedSpan[] {
  const spans: AlignedSpan[] = [];
  let base = 0;
  let current = 0;
  for (const [op, text] of safeDiff(baseValue, currentValue)) {
    const last = spans[spans.length - 1];
    if (op === diff.EQUAL) {
      spans.push({ base, baseLen: text.length, current, currentLen: text.length, equal: true });
      base += text.length;
      current += text.length;
      continue;
    }
    // Borrados e inserciones contiguos forman un solo tramo distinto.
    const span = last && !last.equal ? last : { base, baseLen: 0, current, currentLen: 0, equal: false };
    if (span !== last) spans.push(span);
    if (op === diff.DELETE) {
      span.baseLen += text.length;
      base += text.length;
    } else {
      span.currentLen += text.length;
      current += text.length;
    }
  }
  return spans;
}

/** Lleva una posición del texto base al texto actual. En los bordes de
 *  un tramo distinto (o dentro de él) la posición es ambigua: `'before'`
 *  elige la menor y `'after'` la mayor. */
function mapPosition(spans: AlignedSpan[], pos: number, bias: 'before' | 'after'): number {
  let result: number | null = null;
  for (const s of spans) {
    if (pos < s.base) break;
    if (pos > s.base + s.baseLen) continue;
    let candidate: number;
    if (s.equal) candidate = s.current + (pos - s.base);
    else if (s.baseLen === 0) candidate = bias === 'before' ? s.current : s.current + s.currentLen;
    else if (pos === s.base) candidate = s.current;
    else if (pos === s.base + s.baseLen) candidate = s.current + s.currentLen;
    else candidate = bias === 'before' ? s.current : s.current + s.currentLen;
    if (result === null) result = candidate;
    else result = bias === 'before' ? Math.min(result, candidate) : Math.max(result, candidate);
  }
  return result ?? 0;
}

/** El delta `baseValue` → `newValue`, trasladado a las posiciones de
 *  `currentValue`. Lo que difiere entre `baseValue` y `currentValue` sin
 *  que el delta lo toque queda tal cual. `insertBias` decide el empate
 *  cuando una inserción del delta cae justo donde `currentValue` ya
 *  insertó algo; los dos sentidos (`applyEditorEdit` con 'before',
 *  `rebaseText` con 'after') coinciden en "lo local queda antes de lo
 *  remoto", así el editor y el `Y.Text` muestran el mismo orden. */
function translateEdit(baseValue: string, newValue: string, currentValue: string, insertBias: 'before' | 'after' = 'before'): TextChange[] {
  if (baseValue === currentValue) return diffChanges(baseValue, newValue);
  const spans = alignTexts(baseValue, currentValue);
  const changes = diffChanges(baseValue, newValue).map((change): TextChange => {
    if (change.deleteCount === 0) {
      return { index: mapPosition(spans, change.index, insertBias), deleteCount: 0, insert: change.insert };
    }
    const start = mapPosition(spans, change.index, 'after');
    const end = mapPosition(spans, change.index + change.deleteCount, 'before');
    return { index: start, deleteCount: Math.max(0, end - start), insert: change.insert };
  });
  // La traslación es monótona, pero se recorta por las dudas para que
  // ningún cambio se meta en el tramo del siguiente.
  for (let i = changes.length - 2; i >= 0; i -= 1) {
    const limit = changes[i + 1].index;
    if (changes[i].index > limit) changes[i].index = limit;
    changes[i].deleteCount = Math.min(changes[i].deleteCount, limit - changes[i].index);
  }
  return changes;
}

/**
 * Aplica al `Y.Text` solo lo que el usuario cambió en el editor: el
 * delta entre `baseValue` (lo que el editor mostraba al cargar o al
 * último guardado) y `newValue`, trasladado a las posiciones del
 * `Y.Text`. El editor puede tener una versión vieja del texto (llegó
 * algo de otro cliente por sync mientras estaba abierto); diffear su
 * texto completo contra el `Y.Text` tomaba eso como "borrado por el
 * usuario" y lo eliminaba.
 */
export function applyEditorEdit(doc: Y.Doc, baseValue: string, newValue: string): void {
  if (baseValue === newValue) return;
  applyChanges(doc, translateEdit(baseValue, newValue, getContentText(doc)));
}

/** Resultado de `rebaseText`: el texto nuevo y los cambios aplicados al
 *  original, para trasladar la selección con `mapTextIndex`. */
export interface RebasedText {
  text: string;
  changes: TextChange[];
}

/** Lleva a `targetValue` (lo que muestra el editor) el cambio
 *  `baseValue` → `newValue` que llegó por sync. Es la traslación de
 *  `applyEditorEdit` en sentido contrario. */
export function rebaseText(baseValue: string, newValue: string, targetValue: string): RebasedText {
  if (baseValue === newValue) return { text: targetValue, changes: [] };
  const changes = translateEdit(baseValue, newValue, targetValue, 'after');
  let text = targetValue;
  for (let i = changes.length - 1; i >= 0; i -= 1) {
    const { index, deleteCount, insert } = changes[i];
    text = text.slice(0, index) + insert + text.slice(index + deleteCount);
  }
  return { text, changes };
}

/** Posición `index` del texto original trasladada a través de `changes`
 *  (en orden y en coordenadas del original, como los devuelve
 *  `rebaseText`). Una inserción justo en `index` queda después, y una
 *  posición dentro de un tramo borrado va a su inicio. */
export function mapTextIndex(changes: TextChange[], index: number): number {
  let shift = 0;
  for (const change of changes) {
    if (index <= change.index) break;
    if (index < change.index + change.deleteCount) return change.index + shift;
    shift += change.insert.length - change.deleteCount;
  }
  return index + shift;
}

// ── Estado de un texto abierto en un editor ──────────────────────
// Puerto de `syncPanel` de desktop (`dailyContentSync.ts`). Cada editor
// lleva dos textos: `base`, lo último que vino de la base local (lo
// cargado, lo remoto o lo ya guardado), y `text`, lo que muestra. Al
// guardar se manda solo el delta base → text (`applyEditorEdit`), y lo
// que llega de la base local se lleva al editor rebasando lo escrito.

export interface EditorTextState {
  base: string;
  text: string;
}

/** Lleva al editor `incoming` (el texto actual de la base local).
 *  Devuelve lo que debe mostrar y los cambios aplicados a `text` (para
 *  mover la selección), o `null` si no cambia nada. Si el usuario no
 *  escribió nada desde la base se adopta `incoming` tal cual. */
export function syncEditorText(state: EditorTextState, incoming: string): RebasedText | null {
  if (incoming === state.base) return null;
  const next = state.text === state.base
    ? { text: incoming, changes: diffChanges(state.text, incoming) }
    : rebaseText(state.base, incoming, state.text);
  state.base = incoming;
  if (next.text === state.text) return null;
  state.text = next.text;
  return next;
}
