/**
 * Límite de sellado del `updated` de las notas (regla de los 3 clientes,
 * Jorge, 2026-10-28). El editor autoguarda 600 ms después de cada pausa al
 * escribir, y antes cada guardado sellaba `updated` y mandaba un PATCH de
 * metadata. Ahora:
 *
 * - Una edición de contenido sella como mucho una vez cada `intervalMs`
 *   por nota; las que caen dentro de la ventana quedan pendientes.
 * - Al salir de la nota se sella una vez más si quedó alguna pendiente
 *   (`takePending`).
 * - Título, tags, carpeta, fijado y crear o duplicar sellan al momento
 *   (`immediate`), y cuentan como sello para la ventana.
 *
 * El estado vive en memoria, por nota: al reabrir la app la primera
 * edición sella. Las funciones reciben la hora en milisegundos para
 * poder probarlas con un reloj falso.
 */
export const NOTE_CONTENT_STAMP_INTERVAL_MS = 60_000;

export interface EditStampThrottle {
  /** Registra una edición y dice si sella `updated` ahora. */
  onEdit(id: string, nowMs: number, immediate: boolean): boolean;
  /** `true` si quedó una edición sin sellar. */
  hasPending(id: string): boolean;
  /** Si quedó una edición sin sellar, la da por sellada en `nowMs` y
   *  devuelve `true` (el llamador escribe el sello). */
  takePending(id: string, nowMs: number): boolean;
  /** Olvida la nota (al borrarla). */
  forget(id: string): void;
}

interface StampState {
  lastStampMs: number;
  pending: boolean;
}

export function createEditStampThrottle(intervalMs: number = NOTE_CONTENT_STAMP_INTERVAL_MS): EditStampThrottle {
  const states = new Map<string, StampState>();
  return {
    onEdit(id, nowMs, immediate) {
      const state = states.get(id);
      if (immediate || !state || nowMs - state.lastStampMs >= intervalMs) {
        states.set(id, { lastStampMs: nowMs, pending: false });
        return true;
      }
      state.pending = true;
      return false;
    },
    hasPending(id) {
      return states.get(id)?.pending ?? false;
    },
    takePending(id, nowMs) {
      const state = states.get(id);
      if (!state?.pending) return false;
      states.set(id, { lastStampMs: nowMs, pending: false });
      return true;
    },
    forget(id) {
      states.delete(id);
    },
  };
}
