import { afterEach, describe, expect, it, jest } from '@jest/globals';

import { addDaysISO, isDateOnly, localISODate, parseStamp, stampSortKey, stampToLocalDate, todayISO } from './dates';

// jest.config.js fija TZ=America/Bogota (UTC−5, sin horario de verano): los
// bugs de fechas de Logday aparecían de 7 p. m. a medianoche en Colombia,
// cuando el día UTC ya es el siguiente.

afterEach(() => {
  jest.useRealTimers();
});

describe('zona horaria de las pruebas', () => {
  it('es la de Colombia', () => {
    expect(new Date(2026, 9, 28).getTimezoneOffset()).toBe(300);
  });
});

describe('"hoy" en hora local', () => {
  it('a las 7:30 p. m. sigue siendo hoy, aunque en UTC ya sea mañana', () => {
    jest.useFakeTimers({ now: new Date('2026-10-29T00:30:00.000Z') }); // 28 oct, 7:30 p. m. en Bogotá
    expect(new Date().toISOString().slice(0, 10)).toBe('2026-10-29'); // el bug de antes
    expect(todayISO()).toBe('2026-10-28');
    expect(localISODate()).toBe('2026-10-28');
  });

  it('a las 11:59 p. m. también', () => {
    expect(localISODate(new Date(2026, 9, 28, 23, 59))).toBe('2026-10-28');
  });
});

describe('addDaysISO', () => {
  it('cruza meses, años y el 29 de febrero', () => {
    expect(addDaysISO('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDaysISO('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysISO('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDaysISO('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('sellos en los dos formatos', () => {
  it('un YYYY-MM-DD legado es la medianoche local de ese día, no la de UTC', () => {
    const d = parseStamp('2026-10-28');
    expect(d && localISODate(d)).toBe('2026-10-28');
    expect(d?.getHours()).toBe(0);
    // new Date('2026-10-28') daría el 27 en Colombia.
    expect(localISODate(new Date('2026-10-28'))).toBe('2026-10-27');
  });

  it('un instante de la noche cae en su día local', () => {
    expect(stampToLocalDate('2026-10-29T01:30:00.000Z')).toBe('2026-10-28');
    expect(stampToLocalDate('2026-10-28')).toBe('2026-10-28');
  });

  it('rechaza fechas imposibles y valores vacíos', () => {
    expect(parseStamp('2026-02-31')).toBeNull();
    expect(parseStamp('')).toBeNull();
    expect(parseStamp('   ')).toBeNull();
    expect(parseStamp(null)).toBeNull();
    expect(parseStamp('no es una fecha')).toBeNull();
    expect(stampToLocalDate(undefined)).toBe('');
    expect(stampSortKey('basura')).toBe(0);
  });

  it('ordena formatos mezclados por el momento real, no como strings', () => {
    const legado = '2026-10-28'; // medianoche local = 05:00 UTC del 28
    const nocheAnterior = '2026-10-28T03:00:00.000Z'; // 27 oct, 10 p. m. local
    expect(legado < nocheAnterior).toBe(true); // como string, al revés
    expect(stampSortKey(legado)).toBeGreaterThan(stampSortKey(nocheAnterior));
  });

  it('isDateOnly distingue fecha de calendario de instante', () => {
    expect(isDateOnly('2026-10-28')).toBe(true);
    expect(isDateOnly('2026-10-28T00:00:00.000Z')).toBe(false);
    expect(isDateOnly(null)).toBe(false);
  });
});
