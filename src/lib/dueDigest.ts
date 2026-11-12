import type { Task } from '../types/task';
import { addDaysISO, localISODate } from './dates';

// Resumen diario de vencimientos (specs/notificaciones/). Función pura: qué
// resúmenes programar para los próximos días, con cuántas tareas vencen y
// cuántas están vencidas en cada uno. `src/lib/dueNotifications.ts` los
// programa con expo-notifications.
//
// Se programan por adelantado (7 días) y se reprograman al abrir la app,
// después de cada sync y al cambiar una tarea: así no hace falta ejecución
// en segundo plano. Los números de un día futuro son los de hoy; si algo
// cambia antes, la reprogramación los corrige.

export const DIGEST_DAYS = 7;
export const DIGEST_ID_PREFIX = 'due-digest-';

export interface PlannedDigest {
  /** Identificador estable de la notificación: `due-digest-YYYY-MM-DD`. */
  id: string;
  date: string;
  fireAt: Date;
  dueToday: number;
  overdue: number;
}

/** `hhmm` en 24 h (`HH:MM`). Un valor inválido cae en las 8:00. */
export function parseDigestTime(hhmm: string): { hour: number; minute: number } {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return { hour: 8, minute: 0 };
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) return { hour: 8, minute: 0 };
  return { hour, minute };
}

export function planDueDigests(tasks: Task[], now: Date, hhmm: string, days: number = DIGEST_DAYS): PlannedDigest[] {
  const { hour, minute } = parseDigestTime(hhmm);
  const open = tasks.filter((t) => t.status !== 'done' && !t.deletedAt && !!t.due);
  const today = localISODate(now);
  const plan: PlannedDigest[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDaysISO(today, i);
    const [y, mo, d] = date.split('-').map(Number);
    const fireAt = new Date(y, mo - 1, d, hour, minute, 0, 0);
    if (fireAt.getTime() <= now.getTime()) continue;
    const dueToday = open.filter((t) => t.due === date).length;
    const overdue = open.filter((t) => t.due! < date).length;
    if (dueToday === 0 && overdue === 0) continue;
    plan.push({ id: `${DIGEST_ID_PREFIX}${date}`, date, fireAt, dueToday, overdue });
  }
  return plan;
}

/** Texto del resumen: "3 tareas vencen hoy, 1 vencida". */
export function digestBody(t: (key: string, opts?: Record<string, unknown>) => string, digest: Pick<PlannedDigest, 'dueToday' | 'overdue'>): string {
  if (digest.dueToday === 0) return t('notifications.onlyOverdue', { count: digest.overdue });
  const due = t('notifications.dueToday', { count: digest.dueToday });
  return digest.overdue > 0 ? `${due}, ${t('notifications.overdue', { count: digest.overdue })}` : due;
}
