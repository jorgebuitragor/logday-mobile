// Puente entre `SyncContext.tsx` (componente, dueño del estado de
// conexión) y el código imperativo de sync que vive fuera de React
// (`src/db/*.ts`, `syncEngine.ts`) — que no puede llamar `useSync()`.
// `SyncContext` empuja acá el estado más reciente en un `useEffect`;
// el resto del código de sync lo lee de forma síncrona cuando lo
// necesita, sin pasar props/contexto a través de toda la capa de DB.
// Archivo sin más dependencias a propósito — evita ciclos de import
// entre `db/*.ts` y `syncEngine.ts`.

export interface SyncRuntime {
  enabled: boolean;
  connected: boolean;
  serverUrl: string;
  withSyncAuth: <T>(fn: (token: string) => Promise<T>) => Promise<T>;
}

let runtime: SyncRuntime | null = null;

export function setSyncRuntime(next: SyncRuntime | null): void {
  runtime = next;
}

export function getSyncRuntime(): SyncRuntime | null {
  return runtime;
}
