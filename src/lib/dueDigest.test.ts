import { describe, expect, it } from '@jest/globals';

import type { Task } from '../types/task';
import { digestBody, parseDigestTime, planDueDigests } from './dueDigest';

function task(id: string, due: string | null, status: Task['status'] = 'todo'): Task {
  return {
    id, title: id, taskCode: null, status, tags: [], project: '', created: '2026-11-01', completedAt: null,
    due, progress: null, content: '', updatedAt: '', deletedAt: null,
  };
}

// Jest corre con TZ=America/Bogota (jest.config.js): 11 nov 2026, 7:00 a. m. local.
const NOW = new Date(2026, 10, 11, 7, 0);

describe('planDueDigests', () => {
  it('programa un resumen por día con vencimientos, a la hora elegida, en los próximos 7 días', () => {
    const plan = planDueDigests([task('hoy', '2026-11-11'), task('jueves', '2026-11-12'), task('lejos', '2026-11-30')], NOW, '08:30');
    expect(plan.map((p) => [p.date, p.dueToday, p.overdue])).toEqual([
      ['2026-11-11', 1, 0],
      ['2026-11-12', 1, 1],
      ['2026-11-13', 0, 2],
      ['2026-11-14', 0, 2],
      ['2026-11-15', 0, 2],
      ['2026-11-16', 0, 2],
      ['2026-11-17', 0, 2],
    ]);
    expect(plan[0]).toMatchObject({ id: 'due-digest-2026-11-11' });
    expect([plan[0].fireAt.getHours(), plan[0].fireAt.getMinutes()]).toEqual([8, 30]);
  });

  it('salta hoy si la hora ya pasó y los días sin nada', () => {
    const plan = planDueDigests([task('viernes', '2026-11-13')], new Date(2026, 10, 11, 9, 0), '08:00');
    expect(plan.map((p) => p.date)).toEqual(['2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17']);
  });

  it('no cuenta tareas hechas, borradas ni sin fecha', () => {
    const borrada = { ...task('b', '2026-11-11'), deletedAt: '2026-11-10T00:00:00Z' };
    expect(planDueDigests([task('h', '2026-11-11', 'done'), borrada, task('s', null)], NOW, '08:00')).toEqual([]);
  });
});

describe('parseDigestTime', () => {
  it('lee HH:MM y cae en las 8:00 si no es válida', () => {
    expect(parseDigestTime('07:45')).toEqual({ hour: 7, minute: 45 });
    expect(parseDigestTime('25:00')).toEqual({ hour: 8, minute: 0 });
    expect(parseDigestTime('')).toEqual({ hour: 8, minute: 0 });
  });
});

describe('digestBody', () => {
  const t = (key: string, opts?: Record<string, unknown>) => `${key}:${opts?.count}`;
  it('arma el texto según lo que haya', () => {
    expect(digestBody(t, { dueToday: 3, overdue: 1 })).toBe('notifications.dueToday:3, notifications.overdue:1');
    expect(digestBody(t, { dueToday: 2, overdue: 0 })).toBe('notifications.dueToday:2');
    expect(digestBody(t, { dueToday: 0, overdue: 4 })).toBe('notifications.onlyOverdue:4');
  });
});
