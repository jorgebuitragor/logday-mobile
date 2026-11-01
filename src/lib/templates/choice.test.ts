import { describe, expect, it } from '@jest/globals';
import { buildDailyCopyText } from '../dailyCopyText';
import { buildDailyMessage } from './choice';

// `dateFromISO` de Desktop (colombianHolidays.ts): mediodía local.
const dateFromISO = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
};

const input = {
  prevDate: dateFromISO('2026-10-30'),
  prevActivities: '- A',
  todayDate: dateFromISO('2026-11-02'),
  todayActivities: '- B',
  language: 'es' as const,
  userName: 'Ana',
  now: dateFromISO('2026-11-02'),
};
const usual = buildDailyCopyText('2026-10-30', '- A', '2026-11-02', '- B');

describe('buildDailyMessage', () => {
  it('sin elección, o con la de Logday, da el mensaje de siempre', () => {
    expect(buildDailyMessage(undefined, input)).toBe(usual);
    expect(buildDailyMessage({ source: 'logday', text: '{{hoy.fecha}}' }, input)).toBe(usual);
  });

  it('una propia', () => {
    expect(buildDailyMessage({ source: 'custom', text: 'Daily de {{usuario.nombre}}: {{hoy.actividades}}' }, input)).toBe('Daily de Ana: - B');
  });

  it('una propia vacía usa la de Logday', () => {
    expect(buildDailyMessage({ source: 'custom', text: '  ' }, input)).toBe(usual);
    expect(buildDailyMessage({ source: 'custom' }, input)).toBe(usual);
  });
});
