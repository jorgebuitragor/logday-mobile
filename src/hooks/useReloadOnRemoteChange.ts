import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import type { SyncEntityType } from '../lib/syncApi';
import { onRemoteChange } from '../lib/syncEvents';

/**
 * Recarga una pantalla de listado cuando el pull trae cambios de `types`
 * mientras está enfocada. Antes las listas recargaban solo al recuperar el
 * foco: un cambio de otro cliente no aparecía hasta salir de la pestaña y
 * volver. El pull aplica los cambios de a uno, así que se agrupan en una
 * sola recarga. `reload` tiene que ser estable (`useCallback`).
 */
export function useReloadOnRemoteChange(types: SyncEntityType[], reload: () => void): void {
  const typesKey = types.join(',');
  useFocusEffect(
    useCallback(() => {
      const watched = typesKey.split(',');
      let timer: ReturnType<typeof setTimeout> | null = null;
      const unsubscribe = onRemoteChange((type) => {
        if (!watched.includes(type)) return;
        if (timer) clearTimeout(timer);
        timer = setTimeout(reload, 200);
      });
      return () => {
        unsubscribe();
        if (timer) clearTimeout(timer);
      };
    }, [typesKey, reload])
  );
}
