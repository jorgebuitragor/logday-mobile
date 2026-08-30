// Extraído de `app/note/[id].tsx` (donde vivía local) al necesitarse
// el mismo criterio de normalización también en `app/(tabs)/notes.tsx`
// (edición de tags desde el menú de acciones de la lista, ver
// specs/menu-contextual-notas/). Mismo criterio en los dos lugares:
// minúsculas, sin espacios (guiones en su lugar).
export function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '-');
}
