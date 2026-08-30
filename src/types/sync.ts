// Puerto directo de task-manager/src/types/sync.ts — mismo shape,
// mismo propósito (config persistida + estado de conexión en vivo).
export interface SyncConfig {
  enabled: boolean;
  serverUrl: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  deviceId: string;
}

export type SyncConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
