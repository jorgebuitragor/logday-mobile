import { describe, expect, it } from '@jest/globals';
import { dateFromISO, getPreviousWorkingDay, toISO } from './colombianHolidays';

describe('getPreviousWorkingDay', () => {
  it('salta el fin de semana y los festivos', () => {
    // Lunes 2 nov 2026 es festivo (Todos los Santos, trasladado).
    expect(toISO(getPreviousWorkingDay(dateFromISO('2026-11-03')))).toBe('2026-10-30');
    expect(toISO(getPreviousWorkingDay(dateFromISO('2026-10-28')))).toBe('2026-10-27');
  });

  it('salta los días de ausencia', () => {
    expect(toISO(getPreviousWorkingDay(dateFromISO('2026-11-03'), new Set(['2026-10-30', '2026-10-29'])))).toBe('2026-10-28');
  });
});
