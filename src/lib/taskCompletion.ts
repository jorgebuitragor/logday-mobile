import type { TaskStatus } from '../types/task';

/**
 * `completed_at` que le toca a una tarea al escribir su `status`. Regla
 * de los 3 clientes (Jorge, 2026-10-28):
 *
 * - Al pasar de no-`done` a `done`, siempre `now`, aunque la tarea traiga
 *   un `completed_at` viejo de otro cliente. Antes se conservaba "la
 *   fecha previa si ya estaba sellada", y una tarea reabierta en otro
 *   cliente que no limpiaba el campo volvía a `done` con la fecha vieja.
 * - Si sigue en `done`, conserva el que tenía (aunque sea `null`: editar
 *   el título de una tarea completada no la completa de nuevo hoy).
 * - Fuera de `done`, `null`.
 *
 * `prevStatus` es `null` al crear: una tarea creada ya en `done` se sella.
 * Función pura para poder probarla sin SQLite.
 */
export function nextCompletedAt(
  prevStatus: TaskStatus | null,
  prevCompletedAt: string | null,
  nextStatus: TaskStatus,
  now: string
): string | null {
  if (nextStatus !== 'done') return null;
  if (prevStatus !== 'done') return now;
  return prevCompletedAt;
}
