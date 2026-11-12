import { describe, expect, it, jest } from '@jest/globals';

import appJson from '../../app.json';
import { quickActionHref, quickActionIcon, type QuickActionId } from './quickActions';

jest.mock('expo-quick-actions', () => ({}));
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

const IDS: QuickActionId[] = ['new-task', 'new-note', 'daily-today'];

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

describe('quickActionIcon', () => {
  it('en iOS usa los íconos del sistema', () => {
    expect(IDS.map((id) => quickActionIcon(id, 'ios'))).toEqual(['task', 'compose', 'date']);
  });

  it('en Android cada ícono existe en androidIcons de app.json (si no, sale un círculo vacío)', () => {
    const plugin = appJson.expo.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-quick-actions') as
      | [string, { androidIcons: Record<string, unknown> }]
      | undefined;
    const androidIcons = Object.keys(plugin?.[1].androidIcons ?? {});
    for (const id of IDS) expect(androidIcons).toContain(quickActionIcon(id, 'android'));
  });
});
