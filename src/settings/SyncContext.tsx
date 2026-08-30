import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { SyncApiError, listDevicesRemote, login as loginRemote, refreshToken as refreshTokenRemote } from '../lib/syncApi';
import type { SyncConfig, SyncConnectionStatus } from '../types/sync';

const CONFIG_STORAGE_KEY = 'syncConfig'; // enabled/serverUrl/email/deviceId — no sensible
const ACCESS_TOKEN_KEY = 'sync_access_token';
const REFRESH_TOKEN_KEY = 'sync_refresh_token';

const EMPTY_CONFIG: SyncConfig = { enabled: false, serverUrl: '', email: '', accessToken: '', refreshToken: '', deviceId: '' };

interface SyncContextValue {
  syncConfig: SyncConfig;
  syncConnectionStatus: SyncConnectionStatus;
  syncErrorMsg: string | null;
  lastCheckedAt: string | null;
  syncConnect: (serverUrl: string, email: string, password: string) => Promise<void>;
  syncDisconnect: () => Promise<void>;
  checkConnection: () => Promise<void>;
}

const SyncCtx = createContext<SyncContextValue>({
  syncConfig: EMPTY_CONFIG,
  syncConnectionStatus: 'disconnected',
  syncErrorMsg: null,
  lastCheckedAt: null,
  syncConnect: async () => {},
  syncDisconnect: async () => {},
  checkConnection: async () => {},
});

// Guard de refresh en vuelo compartido a nivel de módulo (no de
// instancia) — puerto directo de `inFlightSyncRefresh` en
// `appStore.ts` de desktop. Existe por una condición de carrera real
// ya encontrada ahí: dos llamadas que pisan un 401 casi al mismo
// tiempo, cada una pidiendo su propio refresh, hacían que el servidor
// detectara reuso de un refresh token ya rotado y revocara el
// dispositivo entero. Con esto, la primera 401 dispara el refresh
// real y guarda la promesa; cualquier otra 401 que llegue mientras
// tanto espera esa misma promesa en vez de disparar la suya.
let inFlightRefresh: Promise<{ access_token: string; refresh_token: string }> | null = null;

function refreshOnce(baseUrl: string, refreshTokenValue: string) {
  if (!inFlightRefresh) {
    inFlightRefresh = refreshTokenRemote(baseUrl, refreshTokenValue).finally(() => {
      inFlightRefresh = null;
    });
  }
  return inFlightRefresh;
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [syncConfig, setSyncConfig] = useState<SyncConfig>(EMPTY_CONFIG);
  const [syncConnectionStatus, setSyncConnectionStatus] = useState<SyncConnectionStatus>('disconnected');
  const [syncErrorMsg, setSyncErrorMsg] = useState<string | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);

  // Espejo síncrono de `syncConfig` para leer el valor más reciente
  // dentro de `withSyncAuth` sin depender de una closure de React que
  // puede haber quedado vieja — mismo problema/solución que el resto
  // de este proyecto resuelve con refs (ver note/[id].tsx).
  const configRef = useRef(syncConfig);
  useEffect(() => {
    configRef.current = syncConfig;
  }, [syncConfig]);

  useEffect(() => {
    (async () => {
      const [storedRaw, accessToken, refreshTokenValue] = await Promise.all([
        AsyncStorage.getItem(CONFIG_STORAGE_KEY),
        SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
      ]);
      if (!storedRaw) return;
      try {
        const stored = JSON.parse(storedRaw) as Omit<SyncConfig, 'accessToken' | 'refreshToken'>;
        const restored: SyncConfig = { ...stored, accessToken: accessToken ?? '', refreshToken: refreshTokenValue ?? '' };
        setSyncConfig(restored);
        if (restored.enabled && restored.accessToken) {
          setSyncConnectionStatus('connected');
        }
      } catch {
        // config corrupta — se ignora, queda desconectado
      }
    })();
  }, []);

  async function persistConfig(next: SyncConfig): Promise<void> {
    const { accessToken, refreshToken: refreshTokenValue, ...rest } = next;
    await Promise.all([
      AsyncStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(rest)),
      accessToken ? SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken) : SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      refreshTokenValue
        ? SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshTokenValue)
        : SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    ]);
  }

  async function syncConnect(serverUrl: string, email: string, password: string): Promise<void> {
    setSyncConnectionStatus('connecting');
    setSyncErrorMsg(null);
    try {
      const deviceName = `Logday Mobile (${Platform.OS})`;
      const tokens = await loginRemote(serverUrl, email, password, deviceName);
      const next: SyncConfig = {
        enabled: true,
        serverUrl,
        email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        deviceId: tokens.device_id,
      };
      await persistConfig(next);
      setSyncConfig(next);
      setSyncConnectionStatus('connected');
    } catch (e) {
      setSyncConnectionStatus('error');
      setSyncErrorMsg(e instanceof SyncApiError ? e.message : e instanceof Error ? e.message : String(e));
      throw e;
    }
  }

  async function syncDisconnect(): Promise<void> {
    await persistConfig(EMPTY_CONFIG);
    setSyncConfig(EMPTY_CONFIG);
    setSyncConnectionStatus('disconnected');
    setSyncErrorMsg(null);
    setLastCheckedAt(null);
  }

  /** Envoltorio de cualquier llamada autenticada a logday-server —
   *  puerto casi literal de `withSyncAuth` en `appStore.ts` de
   *  desktop (ver comentario ahí para el detalle de las 2 condiciones
   *  de carrera reales que corrige, no hipotéticas): si el access
   *  token está vencido, renueva y reintenta una sola vez; si el
   *  refresh también falla por sesión muerta (no por red caída),
   *  desconecta en vez de fallar en silencio. */
  async function withSyncAuth<T>(fn: (token: string) => Promise<T>): Promise<T> {
    const initialCfg = configRef.current;
    if (!initialCfg.enabled || !initialCfg.accessToken) throw new Error('sync not connected');
    try {
      return await fn(initialCfg.accessToken);
    } catch (e) {
      if (!(e instanceof SyncApiError && e.status === 401)) throw e;

      // Puede que otra llamada ya haya renovado el token mientras
      // esta seguía en vuelo — probar con el que haya ahora antes de
      // gastar (y arriesgar) un refresh nuevo.
      const afterFirstFailure = configRef.current;
      if (afterFirstFailure.accessToken && afterFirstFailure.accessToken !== initialCfg.accessToken) {
        try {
          return await fn(afterFirstFailure.accessToken);
        } catch {
          // el token "nuevo" tampoco sirvió — sigue abajo con un refresh real
        }
      }

      const beforeRefresh = configRef.current;
      if (!beforeRefresh.refreshToken) throw e;

      let tokens: { access_token: string; refresh_token: string };
      try {
        tokens = await refreshOnce(beforeRefresh.serverUrl, beforeRefresh.refreshToken);
      } catch (refreshErr) {
        if (refreshErr instanceof SyncApiError && refreshErr.status === 401) {
          await syncDisconnect();
          setSyncErrorMsg(t('sync.sessionExpiredMsg'));
        }
        throw e;
      }

      const nextCfg: SyncConfig = { ...configRef.current, accessToken: tokens.access_token, refreshToken: tokens.refresh_token };
      await persistConfig(nextCfg);
      setSyncConfig(nextCfg);
      return await fn(tokens.access_token);
    }
  }

  /** Acción manual que confirma que la conexión (y el refresh de
   *  tokens) sigue funcionando de verdad — pide `/devices` (liviano,
   *  ya autenticado) en vez de solo confiar en el estado local. Sin
   *  esto no hay ninguna forma de probar el camino de refresh de
   *  `withSyncAuth` hasta que la Fase 2 traiga sync de entidades de
   *  verdad. */
  async function checkConnection(): Promise<void> {
    if (!syncConfig.enabled) return;
    try {
      await withSyncAuth((token) => listDevicesRemote(configRef.current.serverUrl, token));
      setSyncConnectionStatus('connected');
      setSyncErrorMsg(null);
      setLastCheckedAt(new Date().toISOString());
    } catch (e) {
      setSyncConnectionStatus('error');
      setSyncErrorMsg(e instanceof SyncApiError ? e.message : e instanceof Error ? e.message : String(e));
    }
  }

  const value = useMemo(
    () => ({ syncConfig, syncConnectionStatus, syncErrorMsg, lastCheckedAt, syncConnect, syncDisconnect, checkConnection }),
    [syncConfig, syncConnectionStatus, syncErrorMsg, lastCheckedAt]
  );

  return <SyncCtx.Provider value={value}>{children}</SyncCtx.Provider>;
}

export function useSync(): SyncContextValue {
  return useContext(SyncCtx);
}
