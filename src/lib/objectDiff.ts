/**
 * Solo los campos que de verdad cambiaron entre `prev` y `next` — un
 * PATCH mandando todo pisaría, del lado del servidor, cualquier
 * edición concurrente a un campo que acá ni se tocó (LWW por campo,
 * ver logday-server/specs/lww-por-campo/). Mismo motivo que
 * `diffTaskFields` en `appStore.ts` de desktop, generalizado acá para
 * las 4 entidades de la Fase 2 en vez de una función por entidad.
 */
function valuesEqual(a: unknown, b: unknown): boolean {
  // `tags` (Task) es el único campo con valor array entre las 4
  // entidades de la Fase 2 — comparación por referencia siempre daría
  // "cambió" aunque el contenido sea idéntico (el caller casi siempre
  // arma un array nuevo), lo que mandaría ese campo en cada PATCH sin
  // necesidad, arriesgando pisar una edición concurrente real a tags
  // hecha desde otro cliente.
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }
  return a === b;
}

export function diffChangedFields<T extends object>(
  prev: T | null,
  next: T,
  keys: (keyof T)[]
): Partial<T> {
  if (!prev) return { ...next };
  const fields: Partial<T> = {};
  for (const key of keys) {
    if (!valuesEqual(prev[key], next[key])) fields[key] = next[key];
  }
  return fields;
}
