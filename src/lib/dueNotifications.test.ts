import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { listTasks } from '../db/tasks';
import type { Task } from '../types/task';
import {
  disableDueDigest, enableDueDigest, rescheduleDueDigests, setDueDigestTime, startDueDigestScheduling,
} from './dueNotifications';
import { emitPullFinished } from './syncEvents';

// El módulo que programa el resumen, con expo-notifications simulado: qué
// programa, qué borra y cuándo se reprograma. Los textos salen del es.json
// real, para probar también los plurales.

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  AppState: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
}));

jest.mock('../i18n', () => {
  const i18next = jest.requireActual<typeof import('i18next')>('i18next');
  const instance = i18next.createInstance();
  void instance.init({ lng: 'es', resources: { es: { translation: jest.requireActual<Record<string, unknown>>('../i18n/locales/es.json') } } });
  return { __esModule: true, default: instance };
});

jest.mock('../db/tasks', () => ({ listTasks: jest.fn() }));

const mockScheduled = new Map<string, { content: { title: string; body: string; data: unknown }; trigger: { date: Date } }>();
const mockPermission = { granted: true, canAskAgain: true };

jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  getPermissionsAsync: jest.fn(async () => ({ ...mockPermission })),
  requestPermissionsAsync: jest.fn(async () => ({ ...mockPermission })),
  setNotificationChannelAsync: jest.fn(async () => null),
  setNotificationHandler: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getAllScheduledNotificationsAsync: jest.fn(async () => [...mockScheduled.keys()].map((identifier) => ({ identifier }))),
  cancelScheduledNotificationAsync: jest.fn(async (id: string) => {
    mockScheduled.delete(id);
  }),
  scheduleNotificationAsync: jest.fn(async (req: { identifier: string; content: never; trigger: never }) => {
    mockScheduled.set(req.identifier, { content: req.content, trigger: req.trigger });
    return req.identifier;
  }),
}));

function task(id: string, due: string | null): Task {
  return {
    id, title: id, taskCode: null, status: 'todo', tags: [], project: '', created: '2026-11-01', completedAt: null,
    due, progress: null, content: '', updatedAt: '', deletedAt: null,
  };
}

const TODAY = '2026-11-11';

beforeEach(async () => {
  jest.useFakeTimers({ now: new Date(2026, 10, 11, 7, 0), doNotFake: ['setImmediate', 'queueMicrotask'] });
  await AsyncStorage.clear();
  mockScheduled.clear();
  mockScheduled.set('otra-cosa', { content: { title: '', body: '', data: null }, trigger: { date: new Date() } });
  mockPermission.granted = true;
  mockPermission.canAskAgain = true;
  jest.mocked(listTasks).mockResolvedValue([task('a', TODAY), task('b', TODAY), task('c', '2026-11-01')]);
});

describe('resumen de vencimientos', () => {
  it('apagado por omisión: no programa nada', async () => {
    await rescheduleDueDigests();
    expect([...mockScheduled.keys()]).toEqual(['otra-cosa']);
  });

  it('al encenderlo programa los próximos días con el texto en español, y no toca otras notificaciones', async () => {
    expect(await enableDueDigest()).toBe(true);
    expect(mockScheduled.has('otra-cosa')).toBe(true);
    const today = mockScheduled.get(`due-digest-${TODAY}`);
    expect(today?.content).toMatchObject({ title: 'Tus vencimientos', body: '2 tareas vencen hoy, 1 vencida', data: { url: '/' } });
    expect(today?.trigger.date.getHours()).toBe(8);
    expect(mockScheduled.get('due-digest-2026-11-12')?.content.body).toBe('Tienes 3 tareas vencidas');
    expect([...mockScheduled.keys()].filter((k) => k.startsWith('due-digest-'))).toHaveLength(7);
  });

  it('con el permiso negado queda apagado', async () => {
    mockPermission.granted = false;
    expect(await enableDueDigest()).toBe(false);
    await rescheduleDueDigests();
    expect([...mockScheduled.keys()]).toEqual(['otra-cosa']);
  });

  it('cambiar la hora reprograma, y apagarlo borra los resúmenes propios', async () => {
    await enableDueDigest();
    await setDueDigestTime('18:15');
    const d = mockScheduled.get(`due-digest-${TODAY}`)!.trigger.date;
    expect([d.getHours(), d.getMinutes()]).toEqual([18, 15]);
    await disableDueDigest();
    expect([...mockScheduled.keys()]).toEqual(['otra-cosa']);
  });

  it('se reprograma después de un pull, con los datos nuevos', async () => {
    await enableDueDigest();
    const stop = startDueDigestScheduling(() => {});
    await rescheduleDueDigests(); // la reprogramación del arranque
    jest.mocked(listTasks).mockResolvedValue([task('a', TODAY)]);
    emitPullFinished();
    await jest.advanceTimersByTimeAsync(2000);
    for (let i = 0; i < 30; i++) await new Promise((r) => setImmediate(r));
    expect(mockScheduled.get(`due-digest-${TODAY}`)?.content.body).toBe('1 tarea vence hoy');
    // Al día siguiente, la de hoy ya cuenta como vencida.
    expect(mockScheduled.get('due-digest-2026-11-12')?.content.body).toBe('Tienes 1 tarea vencida');
    stop();
  });
});
