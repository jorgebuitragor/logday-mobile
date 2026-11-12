import { describe, expect, it, jest } from '@jest/globals';

import { quickActionHref } from './quickActions';

jest.mock('expo-quick-actions', () => ({}));

describe('quickActionHref', () => {
  it('cada atajo abre su ruta; el daily, el de hoy', () => {
    expect(quickActionHref('new-task')).toBe('/task/new');
    expect(quickActionHref('new-note')).toBe('/note/new');
    expect(quickActionHref('daily-today', '2026-11-11')).toBe('/daily/2026-11-11');
  });

  it('un id ajeno no abre nada', () => {
    expect(quickActionHref('otra-cosa')).toBeNull();
  });
});
