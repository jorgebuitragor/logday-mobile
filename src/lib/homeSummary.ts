import type { AbsenceDay, AbsenceType } from '../types/absence';
import type { Note } from '../types/note';
import type { OvertimeEntry } from '../types/overtime';
import type { Task } from '../types/task';
import { dateFromISO, getColombianHolidays } from './colombianHolidays';
import { addDaysISO, stampSortKey } from './dates';

// El resumen del Inicio (specs/inicio/), adaptado del `DashboardView` de
// Desktop. Función pura: la pantalla le pasa lo que leyó de SQLite y la
// fecha de hoy, así se prueba sin base ni reloj.

export interface WeekDay {
  date: string;
  isToday: boolean;
  isHoliday: boolean;
  absence: AbsenceType | null;
  overtimeHours: number;
}

export interface HomeSummary {
  /** Vencidas, la más vieja primero. */
  overdue: Task[];
  dueToday: Task[];
  /** Vencen en los próximos 6 días (sin hoy), la más cercana primero. */
  dueThisWeek: Task[];
  /** Texto del daily de hoy, o null si no hay. */
  todayDaily: string | null;
  recentNotes: Note[];
  /** Lunes a domingo de la semana de hoy. */
  week: WeekDay[];
  /** Nada guardado todavía: la pantalla muestra la bienvenida. */
  isEmpty: boolean;
}

export const RECENT_NOTES = 5;
const WEEK_AHEAD_DAYS = 6;

export interface HomeSources {
  today: string;
  tasks: Task[];
  notes: Note[];
  todayDaily: string | null;
  absences: AbsenceDay[];
  overtime: OvertimeEntry[];
}

/** Lunes de la semana de `iso` (la semana laboral colombiana empieza el lunes). */
export function mondayOf(iso: string): string {
  const dow = dateFromISO(iso).getDay(); // 0 = domingo
  return addDaysISO(iso, dow === 0 ? -6 : 1 - dow);
}

export function buildHomeSummary({ today, tasks, notes, todayDaily, absences, overtime }: HomeSources): HomeSummary {
  const open = tasks.filter((t) => t.status !== 'done' && !!t.due);
  const byDue = (a: Task, b: Task) => (a.due ?? '').localeCompare(b.due ?? '');
  const weekEnd = addDaysISO(today, WEEK_AHEAD_DAYS);

  const monday = mondayOf(today);
  const days = Array.from({ length: 7 }, (_, i) => addDaysISO(monday, i));
  const years = new Set(days.map((d) => Number(d.slice(0, 4))));
  const holidays = new Set([...years].flatMap((y) => [...getColombianHolidays(y)]));
  const absenceByDate = new Map(absences.map((a) => [a.date, a.type]));
  const hoursByDate = new Map<string, number>();
  for (const e of overtime) hoursByDate.set(e.fecha, (hoursByDate.get(e.fecha) ?? 0) + e.totalHoras);

  const daily = todayDaily?.trim() ? todayDaily : null;

  return {
    overdue: open.filter((t) => t.due! < today).sort(byDue),
    dueToday: open.filter((t) => t.due === today),
    dueThisWeek: open.filter((t) => t.due! > today && t.due! <= weekEnd).sort(byDue),
    todayDaily: daily,
    recentNotes: [...notes].sort((a, b) => stampSortKey(b.updated) - stampSortKey(a.updated)).slice(0, RECENT_NOTES),
    week: days.map((date) => ({
      date,
      isToday: date === today,
      isHoliday: holidays.has(date),
      absence: absenceByDate.get(date) ?? null,
      overtimeHours: Math.round((hoursByDate.get(date) ?? 0) * 100) / 100,
    })),
    isEmpty: tasks.length === 0 && notes.length === 0 && !daily,
  };
}
