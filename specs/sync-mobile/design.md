# Sync con logday-server — Design

Estado: Fase 0 confirmada. Fase 1 (auth + pantalla de conexión)
implementada, pendiente de checkpoint en vivo.

## Por qué portar desktop en vez de diseñar desde cero

Se investigó el código real de `task-manager` (no solo los specs de
`logday-server`, que documentan el protocolo pero no las decisiones de
cliente) — específicamente `src/lib/sync.ts`, `syncQueue.ts`,
`syncMapping.ts`, `contentSyncQueue.ts`, `noteContentSync.ts`,
`syncMigration.ts` y las funciones de sync dentro de
`src/store/appStore.ts` (`withSyncAuth`, `reconcileSync`,
`applyRemoteChanges`, `syncCreate/Patch/DeleteTask`, etc.). Varios
comentarios ahí documentan bugs reales ya encontrados y corregidos en
producción:

- **Condición de carrera en el refresh de tokens**: dos llamadas que
  pisan un 401 casi al mismo tiempo, cada una pidiendo su propio
  refresh, causaban que el servidor detectara reuso de un refresh
  token ya rotado y revocara el dispositivo entero. Se corrige
  compartiendo la promesa del refresh en vuelo (`inFlightSyncRefresh`)
  Y releyendo `syncConfig` fresco en cada paso en vez de la captura
  inicial (una llamada "rezagada" podía usar un refresh token ya
  viejo aunque el guard de arriba ya se hubiera liberado).
- **Respuesta tardía pisando una edición en cola**: si un PATCH viejo
  responde después de que el usuario ya volvió a editar ese mismo
  campo (y esa edición nueva quedó en cola), aplicar la respuesta
  vieja tal cual perdería la edición nueva. Se corrige con
  `hasNewerQueuedField` — cualquier campo con una entrada más nueva en
  cola se salta al aplicar la respuesta.
- **Cola de contenido CRDT sin drenar**: la cola de sync normal
  (`syncQueue.ts`) no encajaba para el contenido Yjs porque su
  semántica de "cola gana sobre respuesta tardía" no aplica a un merge
  conmutativo — se corrige con una cola aparte (`contentSyncQueue.ts`)
  que es un mapa coalescente por `entidad:key`, no un FIFO.

Repetir estos bugs en mobile sería previsible y evitable — por eso
este spec **porta la arquitectura ya depurada**, adaptando solo lo que
es específico de la plataforma (ver abajo), en vez de re-derivar el
diseño desde los specs de protocolo solamente.

## Adaptaciones específicas de mobile (lo que SÍ cambia de desktop)

- **Sin store global reactivo**: desktop tiene un store Zustand único
  donde las entidades viven en memoria; sync llama `set({tasks: ...})`
  directo. Mobile no tiene equivalente — cada pantalla carga su propia
  lista vía `useFocusEffect(reload)` contra SQLite (ya la fuente de
  verdad hoy). Los cambios remotos se escriben directo a SQLite (las
  mismas funciones de `src/db/*.ts` que ya usa cada pantalla), y se
  ven la próxima vez que esa pantalla recupera el foco — mismo
  mecanismo con el que ya conviven hoy los cambios hechos desde *otra*
  pantalla de mobile. No se introduce un store nuevo solo para esto.
- **Transporte HTTP**: desktop usa un comando Tauri (`syncRequest`,
  Rust) porque corre en un webview sin `fetch` de confianza para CORS/
  certificados de servidores locales. Mobile usa `fetch` nativo de
  React Native directo — no hace falta el mismo rodeo.
- **Storage de tokens**: desktop guarda `syncConfig` completo
  (incluidos los tokens) en `localStorage` plano. Mobile usa
  `expo-secure-store` (Keychain en iOS / Keystore en Android) para
  `accessToken`/`refreshToken` específicamente — mejora sobre desktop,
  no una limitación; el resto de `syncConfig` (`serverUrl`/`email`/
  `enabled`/`lastSyncedAt`, no sensible) sigue en `AsyncStorage`, mismo
  mecanismo que el resto de las preferencias de mobile.
- **Punto de llamada de `syncCreate/Patch/Delete`**: en desktop viven
  como parte de los action creators de Zustand (un único lugar central
  de mutación). El equivalente en mobile son las funciones de
  `src/db/*.ts` (`createTask`, `updateNote`, etc.) — se llaman desde
  ahí, no desde cada pantalla, por el mismo motivo: un solo lugar
  central por mutación, no uno por cada sitio de la UI que la dispara.

## Fase 0 — Spike de Yjs en Hermes

Pantalla de prueba descartable (no forma parte del producto final,
se borra o se dej detrás de un flag antes de cerrar esta fase):
crea dos `Y.Doc`, escribe texto en uno, codifica el estado
(`Y.encodeStateAsUpdate`), lo pasa a base64 y de vuelta a bytes
(mismas funciones `bytesToBase64`/`base64ToBytes` que ya existen en
`noteContentSync.ts` de desktop, se portan tal cual — no dependen de
nada específico de Node/browser, son loops manuales sobre
`Uint8Array`), lo aplica al segundo doc (`Y.applyUpdate`), lee el
texto resultante y lo compara.

Candidatos conocidos de polyfill si algo falta en Hermes:
`TextEncoder`/`TextDecoder` (Yjs los usa internamente en algunas
rutas). Si hace falta, se resuelve con un polyfill JS puro (ej.
`fast-text-encoding`), no cambiando de librería CRDT — cambiar de Yjs
rompería la compatibilidad de merge con desktop/logday-web, que ya lo
usan como formato de intercambio.

## Fase 0 — hallazgo real: falta `isomorphic-webcrypto` como dependencia explícita

El bundle de Metro falló en el primer intento (antes de tocar
dispositivo siquiera): `yjs` → `lib0/random.js` → `lib0/webcrypto` →
`lib0/dist/webcrypto.react-native.cjs` → requiere
`isomorphic-webcrypto/src/react-native`, un paquete que `yjs`/`lib0`
NO traen como dependencia — hay que instalarlo aparte
(`npm install isomorphic-webcrypto`). Con eso instalado, el bundle
resuelve limpio (HTTP 200, sin errores de resolución reales).

Inspeccioné `isomorphic-webcrypto/src/react-native.js` (el archivo que
`lib0` termina cargando) para evaluar el riesgo real de un crash en
tiempo de ejecución: usa `global.window.navigator` — React Native SÍ
define `global.window = global` si no existe
(`node_modules/react-native/Libraries/Core/setUpGlobals.js:18-20`,
confirmado leyendo el código fuente instalado), así que esa línea no
truena. Además, ese mismo archivo **define `global.atob`/`global.btoa`
como side-effect de importarlo** si no existen ya — o sea que
`bytesToBase64`/`base64ToBytes` en `yjsSpike.ts` (y más adelante en
`noteContentSync.ts`/`dailyContentSync.ts` de mobile) quedan cubiertas
gratis por esta misma dependencia, no hace falta un polyfill aparte
para eso.

Lo que la inspección estática NO puede confirmar es si las librerías
de crypto pesadas que arrastra `isomorphic-webcrypto`
(`msrcrypto`/`asmcrypto.js`/`@peculiar/webcrypto`) corren sin excepción
dentro de Hermes — eso es exactamente lo que confirma o refuta el
checkpoint en vivo de abajo.

## Fase 0 — resultado confirmado (2026-08-30)

Checkpoint en vivo pasó: "✓ OK — merge correcto ('Hola desde
mobile'), update de 34 bytes." Yjs + `isomorphic-webcrypto` corren
bien en Hermes, sin polyfills adicionales. Único hallazgo: un warning
de LogBox no fatal de `asmcrypto.js` ("seems to be load from an
insecure origin... may cause MitM-attack") — falso positivo conocido
de esa librería (detecta el protocolo de origen como si se sirviera
por HTTP/HTTPS vía script tag en un navegador, algo que no aplica
cuando corre empaquetada dentro de un bundle de Metro); no interrumpe
nada ni afecta el resultado. Vale la pena tenerlo presente para no
confundirlo con un problema real si reaparece en Fase 3.

Yjs queda confirmado como viable para el contenido CRDT de Note/
DailyEntry (Fase 3) sin necesidad de buscar una librería alternativa.

## Fase 1 — Auth + pantalla de conexión

Sin sincronizar ninguna entidad todavía — el objetivo de esta fase es
solo probar login, persistencia de tokens y el camino de refresh
automático de punta a punta.

- `src/types/sync.ts`: `SyncConfig`/`SyncConnectionStatus`, puerto
  literal de los mismos tipos en desktop.
- `src/lib/syncApi.ts`: cliente HTTP vía `fetch` nativo (reemplaza el
  comando Tauri `syncRequest` que usa desktop — React Native no tiene
  el mismo problema de CORS/certificados en un webview que motivó ese
  rodeo). Implementa `login`/`refreshToken`/`listDevicesRemote` — sin
  `revokeDeviceRemote` ni las de entidad todavía, no tienen ningún
  caller en esta fase (se agregan cuando el panel de dispositivos o
  cada fase de sync de entidades las necesite, no antes).
- `src/settings/SyncContext.tsx` (nuevo, mismo patrón que
  `PreferencesContext`/`ThemeContext`): guarda `syncConfig` completo
  en estado; persiste `accessToken`/`refreshToken` en
  `expo-secure-store` (Keychain/Keystore) y el resto
  (`enabled`/`serverUrl`/`email`/`deviceId`) en `AsyncStorage` como un
  único blob JSON — separado a propósito, no todo junto, así los
  tokens nunca terminan en el `AsyncStorage` no cifrado ni por
  accidente. Expone `syncConnect`/`syncDisconnect`/`checkConnection` y
  `withSyncAuth`, puerto casi literal de la función homónima en
  `appStore.ts` de desktop — mismo guard de refresh compartido en
  vuelo (`inFlightRefresh`, a nivel de módulo) y mismo patrón de
  releer la config más fresca antes de reintentar en vez de quedarse
  con la capturada al entrar a la función (las dos condiciones de
  carrera que ese código documenta como ya encontradas en producción,
  no hipotéticas — ver arriba, "Por qué portar desktop").
- `checkConnection()`: acción nueva, sin equivalente directo en
  desktop (que recién prueba el token real cuando llega la Fase 2 de
  sync de entidades) — pide `GET /devices` (liviano, ya autenticado)
  vía `withSyncAuth`. Sin sync de entidades todavía en esta fase, no
  había ninguna otra forma de ejercitar el camino de refresh de
  tokens de punta a punta ni de darle al usuario una señal real de
  "esto sigue funcionando" más allá de un estado local optimista. Se
  quedará en la app más allá de esta fase (es información útil, no
  scaffolding descartable).
- `app/(tabs)/settings.tsx`: nueva sección "Sincronización" —
  formulario URL/correo/contraseña (contraseña con toggle mostrar/
  ocultar) cuando está desconectado; pill de estado + "conectado
  como..." + última verificación + botones "Verificar conexión"/
  "Desconectar" cuando está conectado. Modelado sobre
  `SyncSettingsTab.tsx` de desktop, sin el panel de dispositivos
  (`DevicesPanel`) — fast-follow explícito, no bloquea que sync
  funcione.
- `app/_layout.tsx`: `SyncProvider` agregado al árbol de providers,
  mismo nivel que `PreferencesProvider`/`ThemeProvider`.
- Sin confirmación antes de "Desconectar" — a diferencia de las
  eliminaciones de datos (`useConfirmDelete`), desconectar sync no
  borra nada local, es reversible con solo volver a conectar; no
  ameritaba reusar ese hook para algo que no es su semántica.

## Explícitamente pendiente

- Diseño detallado de Fases 2-4 — se escribe en este mismo archivo a
  medida que arranca cada fase (no de antemano, para no comprometerse
  a decisiones que un checkpoint en vivo anterior podría invalidar).
- Panel de dispositivos/sesiones (listar/revocar) — fast-follow, no
  bloquea que sync funcione.
