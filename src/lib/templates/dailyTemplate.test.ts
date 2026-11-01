import { describe, expect, it } from '@jest/globals';
import { LOGDAY_DAILY_TEMPLATE, dailyDateLabel, dailyTemplateContext, renderTemplate } from './dailyTemplate';

// `dateFromISO` de Desktop (colombianHolidays.ts): mediodía local.
const dateFromISO = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
};

// El mensaje de siempre de Desktop y Web (`buildDailyCopyText` de
// colombianHolidays.ts), copiado para la prueba. El de Mobile
// (dailyCopyText.ts) es una versión reducida, con fechas `YYYY-MM-DD` y
// siempre "El día de hoy", así que LOGDAY_DAILY_TEMPLATE no da lo mismo que
// él: da lo mismo que este.
const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const dayLabel = (d: Date) => `${DAYS[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
function buildDailyCopyText(prevDate: Date, prevActivities: string, todayDate: Date, todayActivities: string): string {
  const prev = prevActivities.trim() || '- (sin actividades registradas)';
  const today = todayActivities.trim() || '- (sin actividades aún)';
  const realToday = new Date();
  const isToday =
    todayDate.getFullYear() === realToday.getFullYear() &&
    todayDate.getMonth() === realToday.getMonth() &&
    todayDate.getDate() === realToday.getDate();
  const todayLabel = isToday ? `El día de hoy, ${dayLabel(todayDate)}:` : `El día ${dayLabel(todayDate)}:`;
  return ['Buenos días.', '', `El día ${dayLabel(prevDate)}:`, prev, '', todayLabel, today].join('\n');
}

const ctx = (todayISO: string, nowISO: string, prev = '- Revisé el PR', today = '- Desplegar', language: 'es' | 'en' = 'es') =>
  dailyTemplateContext({
    prevDate: dateFromISO('2026-10-30'),
    prevActivities: prev,
    todayDate: dateFromISO(todayISO),
    todayActivities: today,
    language,
    userName: 'Ana',
    now: dateFromISO(nowISO),
  });

describe('renderTemplate', () => {
  it('llena valores y secciones', () => {
    const r = renderTemplate('Hola {{a}}.{{#b}} sí{{/b}}{{^b}} no{{/b}}', { a: 'Ana', b: true });
    expect(r).toEqual({ text: 'Hola Ana. sí', unknown: [], error: null });
    expect(renderTemplate('{{#b}}sí{{/b}}{{^b}}no{{/b}}', { b: false }).text).toBe('no');
  });

  it('un marcador desconocido queda vacío y se reporta una vez', () => {
    const r = renderTemplate('{{x}}-{{x}}-{{ a }}', { a: '1' });
    expect(r.text).toBe('--1');
    expect(r.unknown).toEqual(['x']);
  });

  it('una sección sin cerrar deja el texto tal cual', () => {
    const r = renderTemplate('A {{#b}} B', { b: true });
    expect(r.text).toBe('A {{#b}} B');
    expect(r.error).not.toBeNull();
    expect(renderTemplate('A {{/b}}', {}).error).not.toBeNull();
  });
});

describe('la plantilla de Logday', () => {
  it('da lo mismo que buildDailyCopyText', () => {
    const now = new Date();
    const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    for (const [day, prev, today] of [
      [todayISO, '- A\n- B', '- C'],
      ['2026-11-03', '', ''],
      ['2026-11-03', '  - con espacios  ', '- x'],
    ]) {
      const expected = buildDailyCopyText(dateFromISO('2026-10-30'), prev, dateFromISO(day), today);
      const ours = renderTemplate(LOGDAY_DAILY_TEMPLATE, dailyTemplateContext({
        prevDate: dateFromISO('2026-10-30'), prevActivities: prev, todayDate: dateFromISO(day), todayActivities: today, language: 'es',
      }));
      expect(ours.text).toBe(expected);
    }
  });

  it('solo usa marcadores que existen', () => {
    expect(renderTemplate(LOGDAY_DAILY_TEMPLATE, ctx('2026-11-02', '2026-11-02')).unknown).toEqual([]);
  });

  it('las fechas en inglés y el texto sin actividades', () => {
    expect(dailyDateLabel(dateFromISO('2026-11-02'), 'en')).toBe('Monday, November 2');
    const en = ctx('2026-11-02', '2026-11-02', '', '', 'en');
    expect(en['anterior.actividades']).toBe('- (no activities recorded)');
    expect(en['hoy.es_hoy']).toBe(true);
  });
});
