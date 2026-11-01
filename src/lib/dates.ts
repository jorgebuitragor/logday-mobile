// Utilidades de fecha compartidas — antes duplicadas como funciones
// locales `todayISO()` en 4 archivos distintos (dailys.tsx,
// daily/[date].tsx, overtime/new.tsx, AppDatePicker.tsx).
//
// Hay dos clases de fecha en el modelo (decisión del ecosistema, ver
// specs/pantalla-tasks/design.md):
//
// - Fechas de calendario (`due`, `fecha`, `date`): `YYYY-MM-DD` en la
//   zona local, sin hora. Se generan con `localISODate`/`todayISO`, nunca
//   con `toISOString().slice(0, 10)`, que en Colombia da el día siguiente
//   desde las 7 p. m.
// - Sellos de creación y edición (`created` y `completed_at` de tareas,
//   `created` y `updated` de notas): instantes UTC con el formato de
//   `toISOString()`. Desktop y Web escribían `YYYY-MM-DD` y esos valores
//   legados siguen llegando por sync, así que la lectura acepta las dos
//   formas con `parseStamp` y derivados. Nunca se pasa un `YYYY-MM-DD`
//   por `new Date('YYYY-MM-DD')` (lo interpreta como medianoche UTC, que
//   en Colombia es el día anterior), y nunca se comparan ni se ordenan
//   como strings valores de formatos mezclados.
//
// Los nombres `nowInstant`, `isDateOnly`, `parseStamp`, `stampToLocalDate`
// y `stampSortKey` son los mismos en Desktop y Web.

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** `YYYY-MM-DD` de `d` en la zona local del dispositivo. */
export function localISODate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Hoy como fecha de calendario local. Alias de `localISODate()`. */
export function todayISO(): string {
  return localISODate();
}

export function addDaysISO(iso: string, delta: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return localISODate(new Date(y, m - 1, d + delta));
}

/** Instante actual en el formato de los sellos (`toISOString()`, UTC). */
export function nowInstant(): string {
  return new Date().toISOString();
}

/** `true` si `v` es una fecha de calendario `YYYY-MM-DD` (sin hora). */
export function isDateOnly(v: string | null | undefined): v is string {
  return typeof v === 'string' && DATE_ONLY_RE.test(v);
}

/**
 * Convierte un sello (`created`, `completed_at`, `updated`) a `Date`:
 * un `YYYY-MM-DD` legado da la medianoche local de ese día; un instante
 * da su `Date`; vacío o inválido da `null`.
 */
export function parseStamp(v: string | null | undefined): Date | null {
  if (typeof v !== 'string' || v.trim() === '') return null;
  const s = v.trim();
  const m = DATE_ONLY_RE.exec(s);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const date = new Date(y, mo - 1, d);
    // `new Date(2026, 1, 31)` se desborda a marzo: eso es un valor
    // inválido, no otra fecha.
    if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
    return date;
  }
  const date = new Date(s);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Fecha de calendario local (`YYYY-MM-DD`) del sello, o `''`. */
export function stampToLocalDate(v: string | null | undefined): string {
  const date = parseStamp(v);
  return date ? localISODate(date) : '';
}

/**
 * Clave numérica para ordenar sellos de formatos mezclados: milisegundos
 * de época, o `0` si el valor está vacío o es inválido (queda al final
 * en un orden descendente).
 */
export function stampSortKey(v: string | null | undefined): number {
  const date = parseStamp(v);
  return date ? date.getTime() : 0;
}
