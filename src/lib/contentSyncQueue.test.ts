import { beforeEach, describe, expect, it } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

import * as contentSyncQueue from './contentSyncQueue';


beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('contentSyncQueue.drain', () => {
  it('conserva el estado más nuevo guardado mientras viajaba el anterior', async () => {
    await contentSyncQueue.enqueue('note', 'n1', 'v1');
    const sent: string[] = [];
    await contentSyncQueue.drain(async (_entity, _key, update) => {
      sent.push(update);
      if (update === 'v1') await contentSyncQueue.enqueue('note', 'n1', 'v2');
    });
    expect(sent).toEqual(['v1']);
    expect(await contentSyncQueue.queueLength()).toBe(1);

    await contentSyncQueue.drain(async (_entity, _key, update) => {
      sent.push(update);
    });
    expect(sent).toEqual(['v1', 'v2']);
    expect(await contentSyncQueue.queueLength()).toBe(0);
  });

  it('un fallo transitorio deja la entrada y las siguientes en cola', async () => {
    await contentSyncQueue.enqueue('note', 'n1', 'a');
    await contentSyncQueue.enqueue('daily_entry', '2026-11-11', 'b');
    await contentSyncQueue.drain(async () => {
      throw new Error('red caída');
    });
    expect(await contentSyncQueue.queueLength()).toBe(2);
  });

  it('no pierde un enqueue de otra entidad hecho durante el envío', async () => {
    await contentSyncQueue.enqueue('note', 'n1', 'a');
    await contentSyncQueue.drain(async () => {
      await contentSyncQueue.enqueue('daily_entry', '2026-11-11', 'b');
    });
    const stored = JSON.parse((await AsyncStorage.getItem('contentSyncQueue')) || '{}');
    expect(Object.keys(stored)).toEqual(['daily_entry:2026-11-11']);
  });
});
