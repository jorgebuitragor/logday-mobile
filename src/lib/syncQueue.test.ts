import { beforeEach, describe, expect, it } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

import * as syncQueue from './syncQueue';


async function storedQueue(): Promise<syncQueue.QueuedWrite[]> {
  return JSON.parse((await AsyncStorage.getItem('syncQueue')) || '[]');
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('syncQueue.drainQueue', () => {
  it('no pierde lo que se encola mientras se manda otra entrada', async () => {
    await syncQueue.enqueue('task', 't1', 'patch', { title: 'a' });
    await syncQueue.drainQueue(async () => {
      // Una edición nueva que falló al mandarse directo y se encola justo ahora.
      await syncQueue.enqueue('task', 't2', 'patch', { title: 'b' });
      return 'ok';
    });
    const left = await storedQueue();
    expect(left.map((w) => w.entityId)).toEqual(['t2']);
  });

  it('quita las fallas permanentes y corta en la primera transitoria, sin reordenar', async () => {
    await syncQueue.enqueue('task', 'bad', 'patch', { title: 'x' });
    await syncQueue.enqueue('task', 'offline', 'create', { title: 'y' });
    await syncQueue.enqueue('task', 'after', 'patch', { title: 'z' });
    const sent: string[] = [];
    await syncQueue.drainQueue(async (w) => {
      sent.push(w.entityId);
      if (w.entityId === 'bad') return 'permanent-failure';
      throw new Error('sesión vencida');
    });
    expect(sent).toEqual(['bad', 'offline']);
    expect((await storedQueue()).map((w) => w.entityId)).toEqual(['offline', 'after']);
  });

  it('dos drenados a la vez mandan cada escritura una sola vez', async () => {
    await syncQueue.enqueue('task', 't1', 'patch', { title: 'a' });
    await syncQueue.enqueue('task', 't2', 'patch', { title: 'b' });
    const sent: string[] = [];
    const send = async (w: syncQueue.QueuedWrite) => {
      sent.push(w.entityId);
      return 'ok' as const;
    };
    await Promise.all([syncQueue.drainQueue(send), syncQueue.drainQueue(send)]);
    expect(sent).toEqual(['t1', 't2']);
    expect(await storedQueue()).toEqual([]);
  });

  it('muchos enqueue en paralelo quedan todos guardados', async () => {
    await Promise.all(Array.from({ length: 20 }, (_, i) => syncQueue.enqueue('task', `t${i}`, 'delete')));
    expect(await syncQueue.queueLength()).toBe(20);
  });
});
