import * as Y from 'yjs';

// SPIKE TEMPORAL — Fase 0 de specs/sync-mobile/. Se borra (este
// archivo y su botón en Ajustes) en cuanto el checkpoint en vivo
// confirme que Yjs corre bien en Hermes. No es parte del producto.
//
// Prueba el camino real que va a usar el contenido CRDT de Note/
// DailyEntry: crear un Y.Doc, escribir en un Y.Text bajo la key
// "content" (misma key que ygo del servidor y logday-web, ver
// noteContentSync.ts de desktop), codificar el estado como update
// binario, pasarlo por base64 (así viaja en el JSON del servidor) y
// aplicarlo a un segundo Y.Doc — confirma que el merge funciona
// dentro del runtime real (Hermes), no solo en Node.
const CONTENT_KEY = 'content';

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function runYjsSpike(): { ok: boolean; detail: string } {
  try {
    const docA = new Y.Doc();
    docA.getText(CONTENT_KEY).insert(0, 'Hola desde mobile');
    const updateA = Y.encodeStateAsUpdate(docA);
    const b64 = bytesToBase64(updateA);

    const docB = new Y.Doc();
    Y.applyUpdate(docB, base64ToBytes(b64));
    const merged = docB.getText(CONTENT_KEY).toString();

    if (merged !== 'Hola desde mobile') {
      return { ok: false, detail: `Merge dio un resultado inesperado: "${merged}"` };
    }
    return { ok: true, detail: `OK — merge correcto ("${merged}"), update de ${updateA.byteLength} bytes.` };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? `${e.name}: ${e.message}` : String(e) };
  }
}
