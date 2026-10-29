// Progreso opcional de una tarea (`Task.progress`): entero de 0 a 100,
// o `null` = sin progreso. `null` no equivale a `0`: la tarea sin
// progreso no lleva porcentaje, la que tiene `0` lo lleva y va en cero.
// Contrato en logday-server/specs/esquema-datos/requirements.md
// ("Progreso de tareas") y en specs/progreso-tasks/ de este repo.

export const PROGRESS_MIN = 0;
export const PROGRESS_MAX = 100;

/** `true` si el valor se puede guardar y mandar tal cual: `null` o un
 *  entero entre 0 y 100. El servidor responde 400 a cualquier otra cosa
 *  ("progress must be an integer between 0 and 100, or null"), así que
 *  se valida en local para no llegar a recibirlo. */
export function isValidProgress(value: unknown): value is number | null {
  if (value === null) return true;
  return typeof value === 'number' && Number.isInteger(value) && value >= PROGRESS_MIN && value <= PROGRESS_MAX;
}

/** Valor que trae el servidor (respuesta de POST/PATCH o `data` de
 *  `/sync/changes`), llevado al modelo local. La clave ausente cuenta
 *  como `null`: un servidor anterior al campo no la manda. Un valor
 *  inválido también queda en `null` en vez de guardarse. */
export function progressFromServer(value: unknown): number | null {
  return value !== undefined && isValidProgress(value) ? value : null;
}

export type ParsedProgress = { ok: true; value: number | null } | { ok: false };

/** Texto del campo del formulario. Vacío = sin progreso. Solo dígitos:
 *  "40.5", "-1" o "1e2" no son válidos aunque `Number()` los acepte. */
export function parseProgressText(text: string): ParsedProgress {
  const trimmed = text.trim();
  if (trimmed === '') return { ok: true, value: null };
  if (!/^\d{1,3}$/.test(trimmed)) return { ok: false };
  const value = Number(trimmed);
  return value <= PROGRESS_MAX ? { ok: true, value } : { ok: false };
}

export function progressToText(value: number | null): string {
  return value === null ? '' : String(value);
}
