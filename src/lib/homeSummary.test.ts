import { describe, expect, it } from '@jest/globals';

import type { AbsenceDay } from '../types/absence';
import type { Note } from '../types/note';
import type { OvertimeEntry } from '../types/overtime';
import type { Task } from '../types/task';
import { buildHomeSummary, mondayOf } from './homeSummary';

function task(id: string, due: string | null, status: Task['status'] = 'todo'): Task {
  return {
    id, title: id, taskCode: null, status, tags: [], project: '', created: '2026-11-01', completedAt: null,
    due, progress: null, content: '', updatedAt: '', deletedAt: null,
  };
}

function note(id: string, updated: string): Note {
  return { id, title: id, folder: '', tags: [], created: updated, updated, pinned: false, content: '', updatedAt: '', deletedAt: null };
}

const base = { today: '2026-11-11', tasks: [], notes: [], todayDaily: null, absences: [], overtime: [] };

describe('buildHomeSummary', () => {
  it('separa vencidas, de hoy y de la semana, sin las hechas ni las sin fecha', () => {
    const s = buildHomeSummary({
      ...base,
      tasks: [
        task('vieja', '2026-11-01'),
        task('ayer', '2026-11-10'),
        task('hoy', '2026-11-11'),
        task('hecha-hoy', '2026-11-11', 'done'),
        task('en-6', '2026-11-17'),
        task('en-2', '2026-11-13'),
        task('en-7', '2026-11-18'),
        task('sin-fecha', null),
      ],
    });
    expect(s.overdue.map((t) => t.id)).toEqual(['vieja', 'ayer']);
    expect(s.dueToday.map((t) => t.id)).toEqual(['hoy']);
    expect(s.dueThisWeek.map((t) => t.id)).toEqual(['en-2', 'en-6']);
  });

  it('notas recientes por `updated`, mezclando fechas legadas e instantes', () => {
    const notes = [
      note('a', '2026-11-01'),
      note('b', '2026-11-10T15:00:00.000Z'),
      note('c', '2026-11-11'),
      note('d', '2026-10-01'),
      note('e', '2026-11-09T01:00:00Z'),
      note('f', '2026-09-01'),
    ];
    expect(buildHomeSummary({ ...base, notes }).recentNotes.map((n) => n.id)).toEqual(['c', 'b', 'e', 'a', 'd']);
  });

  it('la semana va de lunes a domingo con festivos, ausencias y horas extra', () => {
    const absences: AbsenceDay[] = [{ id: 'x', date: '2026-11-12', type: 'vacaciones', note: null, updatedAt: '', deletedAt: null }];
    const overtime = [
      { fecha: '2026-11-11', totalHoras: 2 },
      { fecha: '2026-11-11', totalHoras: 1.5 },
    ] as OvertimeEntry[];
    const s = buildHomeSummary({ ...base, absences, overtime });
    expect(s.week.map((d) => d.date)).toEqual(['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15']);
    // 16 nov 2026 es festivo (Independencia de Cartagena, trasladado al lunes),
    // la semana siguiente; el 9 no lo es.
    expect(s.week.find((d) => d.isToday)?.date).toBe('2026-11-11');
    expect(s.week[2].overtimeHours).toBe(3.5);
    expect(s.week[3].absence).toBe('vacaciones');
    expect(s.week.some((d) => d.isHoliday)).toBe(false);
    expect(buildHomeSummary({ ...base, today: '2026-11-18' }).week[0]).toMatchObject({ date: '2026-11-16', isHoliday: true });
  });

  it('una semana que cruza de año usa los festivos de los dos años', () => {
    const s = buildHomeSummary({ ...base, today: '2026-12-31' });
    expect(s.week[0].date).toBe('2026-12-28');
    expect(s.week.find((d) => d.date === '2027-01-01')?.isHoliday).toBe(true);
  });

  it('mondayOf: el domingo pertenece a la semana que empezó el lunes anterior', () => {
    expect(mondayOf('2026-11-15')).toBe('2026-11-09');
    expect(mondayOf('2026-11-09')).toBe('2026-11-09');
  });

  it('vacío solo sin tareas, notas ni daily de hoy', () => {
    expect(buildHomeSummary(base).isEmpty).toBe(true);
    expect(buildHomeSummary({ ...base, todayDaily: '  ' }).isEmpty).toBe(true);
    expect(buildHomeSummary({ ...base, todayDaily: '- algo' }).isEmpty).toBe(false);
    expect(buildHomeSummary({ ...base, tasks: [task('t', null)] }).isEmpty).toBe(false);
  });
});
