# Sync con logday-server — Design

Estado: Fases 0, 1 y 2 confirmadas en vivo. Fase 3 implementada,
pendiente de checkpoint en vivo.

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

## Nota de entorno: `logday-server` local corre en Docker

Descubierto verificando la Fase 2 en vivo: el `logday-server` local
del usuario (`http://192.168.20.121:8080`) NO corre como proceso nativo
del host — corre en un contenedor Docker (`logday-server-server-1`,
imagen `logday-server-server`), con su propia base SQLite en
`/data/logday.db` **dentro** del contenedor. El archivo
`logday-server/data/logday.db` del host (que existe, tiene tablas,
pero está vacío) es un leftover de una corrida anterior sin Docker —
consultarlo directo lleva a conclusiones falsas ("no llegó nada")
cuando en realidad sí llegó, solo que a otra base. Para inspeccionar
el estado real: `docker ps` para confirmar el contenedor, `docker cp
logday-server-server-1:/data/logday.db <ruta-local>` (no tiene
`sqlite3` instalado adentro) y leer la copia con `sqlite3 -readonly`.

## Fase 2 — Sync de metadatos LWW (Task/OvertimeEntry/OvertimeMonthMeta/AbsenceDay)

Aisladas del contenido CRDT a propósito — son puro REST + LWW por
campo, sin la complejidad de Yjs (esa llega en la Fase 3 con Note/
DailyEntry).

- `src/lib/syncMapping.ts`: tipos `*CreatePayload`/`*PatchPayload`/
  `*ApiResponse` + funciones `*ToCreatePayload`/`*FieldsToPatchPayload`/
  `*FromApiResponse` + `*_FIELD_MAP` (local↔servidor) por entidad —
  puerto directo de `task-manager/src/lib/syncMapping.ts`, recortado a
  estas 4. Los nombres de campo de mobile ya coincidían 1:1 con los de
  desktop (`OvertimeEntry` ya usaba español — `fecha`/`solicitadaPor`/
  etc. — desde que se portó esa pantalla), así que el mapeo es
  prácticamente una copia literal, no una traducción.
- `src/lib/syncQueue.ts`: puerto de la cola offline de desktop
  (`QueuedWrite`/`enqueue`/`drainQueue`/`hasNewerQueuedField`),
  `AsyncStorage` en vez de `localStorage` (por eso todas las funciones
  son async acá, a diferencia de desktop).
- `src/lib/objectDiff.ts` (nuevo, sin equivalente directo en desktop):
  `diffChangedFields<T>(prev, next, keys)` genérico — desktop escribe
  una función de diff por entidad (`diffTaskFields`,
  `diffOvertimeEntryFields`, ...) porque su tipado de campos es más
  heterogéneo; acá se generalizó a una sola función reusada por las 4
  entidades. Único caso especial: comparación por valor (no por
  referencia) para `tags` (el único campo array de las 4 entidades) —
  sin eso, cualquier edición marcaría `tags` como "cambiado" aunque el
  contenido fuera idéntico (el caller arma un array nuevo cada vez),
  mandándolo en cada PATCH y arriesgando pisar una edición concurrente
  real a tags hecha desde otro cliente.
- `src/lib/syncRuntime.ts` (nuevo, sin equivalente en desktop —
  desktop no lo necesita porque Zustand es accesible desde cualquier
  módulo vía `get()/set()` importado): puente síncrono entre
  `SyncContext.tsx` (dueño del estado de conexión, componente) y el
  código imperativo de sync que vive fuera de React (`db/*.ts`,
  `syncEngine.ts`, que no pueden llamar `useSync()`). `SyncContext`
  empuja el estado más reciente en un `useEffect`
  (`setSyncRuntime({enabled, connected, serverUrl, withSyncAuth})`);
  el resto lo lee de forma síncrona (`getSyncRuntime()`) cuando lo
  necesita.
- **Dónde vive el push/apply de cada entidad — decisión de
  arquitectura importante**: NO en `syncEngine.ts`, sino dentro de
  cada `src/db/tasks.ts`/`overtime.ts`/`absences.ts`. Motivo: evitar
  un ciclo de import. `syncEngine.ts` necesita las funciones
  `applyRemote<Entidad>Change` de cada `db/*.ts` para aplicar el pull;
  si las funciones de push (`syncCreate/Patch/Delete<Entidad>`)
  también vivieran en `syncEngine.ts`, y `db/*.ts` necesita llamarlas
  después de cada escritura local, el import sería circular
  (`db/tasks.ts` → `syncEngine.ts` → `db/tasks.ts`). Con el push y el
  apply-de-remoto los dos dentro del mismo `db/*.ts`, la dependencia
  queda en una sola dirección: `db/*.ts` → `syncApi.ts`/
  `syncMapping.ts`/`syncQueue.ts`/`syncRuntime.ts` (ninguno de esos
  importa `db/*.ts`), y `syncEngine.ts` → `db/*.ts` (solo para
  `applyRemote*Change`, el dispatch del pull). Coincide además con el
  criterio ya escrito en `requirements.md`: `db/*.ts` es el punto
  central de mutación de mobile, equivalente a los action creators de
  Zustand en desktop.
- **Por qué el apply-de-remoto NO reusa `createTask`/`updateTask`/
  etc.**: esas funciones, al final de cada escritura, disparan el push
  de sync (`void syncCreateTask(...)`) — si `applyRemoteTaskChange`
  las reusara para escribir el cambio que acaba de llegar del pull, se
  generaría un loop (aplicar un cambio remoto dispararía mandarlo de
  vuelta al servidor). Por eso el apply-de-remoto escribe con SQL
  directo (`writeTaskRow`/equivalentes), separado de las funciones
  públicas que sí usan las pantallas.
- Cada `db/*.ts` gana, al final de cada función pública ya existente
  (`createTask`/`updateTask`/`updateTaskStatus`/`softDeleteTask`,
  y sus equivalentes en `overtime.ts`/`absences.ts`), una llamada
  fire-and-forget (`void syncCreateX(...)`) al push correspondiente —
  intenta mandar ya si hay conexión, encola si no (o si falla). Mismo
  patrón que `syncCreateTask` en `appStore.ts` de desktop.
  `updateTask`/`updateOvertimeEntry`/`saveAbsenceDay` primero calculan
  qué campos cambiaron de verdad (`diffChangedFields`) antes de armar
  el PATCH — un PATCH con todos los campos, aunque no hayan cambiado,
  pisaría en el servidor cualquier edición concurrente a un campo que
  acá ni se tocó (mismo motivo que `diffTaskFields` en desktop).
- `syncEngine.ts`: el orquestador — `reconcileSync()` (pull paginado
  desde `/sync/changes`, cursor en `AsyncStorage`, full-resync
  automático ante 410 — puerto de `reconcileSync`/`fetchAllChanges` en
  `appStore.ts`), `drainSyncQueue()` (reenvía la cola offline, mismo
  despacho por entidad+operación que `dispatchQueuedWrite` de
  desktop), y el polling de 30s (`startPolling`/`stopPolling`, arranca
  al conectar) — cada tick drena la cola antes de reconciliar
  (mismo motivo que desktop: sin esto una entrada quedaría en cola
  para siempre aunque la app siga "Conectado").
- `src/lib/realtime.ts` (23 oct 2026): tiempo real contra `GET /ws`,
  igual que Desktop y Web. El primer mensaje es `{type: "auth", token}`;
  cada aviso del servidor dispara, agrupado cada 250 ms, el mismo
  `reconcileSync` del polling, que queda de respaldo. Al cerrarse la
  conexión hace un pull antes de reconectar, para ponerse al día y para
  renovar el access token si la auth falló (el servidor cierra con
  1008). Reintenta con backoff de 3 a 60 s. `SyncContext` lo abre con la
  conexión, lo cierra cuando la app pasa a segundo plano (iOS la
  suspende) y al volver al frente lo reabre después de un pull.
  Desde nov 2026 (A-10 de la auditoría) no hace pull por el eco de las
  escrituras propias: `syncApi.request` anota en `ownWrites.ts` el `seq`
  de cada respuesta de escritura (los últimos 200), `realtime.ts` le
  pasa a `onNotice` los `seq` de los avisos agrupados, y
  `handleRealtimeNotices` (`syncEngine.ts`) se salta el pull si todos
  son propios o ya los cubre el cursor. Es lo mismo que Desktop y Web,
  con una diferencia: Web avanza el cursor con el `seq` de sus
  escrituras, y aquí no, porque eso se salta los cambios de otros
  clientes con `seq` en medio. Los borrados no se reconocen (el
  servidor responde 204 sin `seq`) y su eco sigue haciendo un pull. Los
  `seq` propios se olvidan al abrir el tiempo real, porque la sesión
  pudo cambiar de cuenta.
- `SyncContext.tsx`: 2 `useEffect` nuevos — uno empuja el runtime a
  `syncRuntime.ts` en cada cambio relevante de `syncConfig`/
  `syncConnectionStatus`; otro arranca `drainSyncQueue().then(reconcileSync)`
  de inmediato (no espera los 30s del primer tick) + `startPolling()`
  al pasar a "Conectado" (cubre tanto conectar recién como recuperar
  una sesión ya conectada al abrir la app), y para el polling al
  desconectar.

## Fase 3 — Note y DailyEntry: metadatos (LWW) + contenido (Yjs CRDT)

La fase de mayor riesgo del plan original — pero terminó tocando
mucho menos superficie de lo anticipado, ver "Desviación positiva del
plan original" abajo.

- **Migración de esquema**: `src/db/index.ts` gana `ensureColumn()` —
  primera migración real de este proyecto (todos los cambios de
  esquema anteriores fueron tablas nuevas, que `CREATE TABLE IF NOT
  EXISTS` ya cubre solo). Agrega `content_state TEXT` a `notes` y
  `daily_entries` (snapshot Yjs completo, base64) revisando `PRAGMA
  table_info` antes de cada `ALTER TABLE` — no depende de capturar el
  mensaje de error de "columna duplicada", que `expo-sqlite` no
  distingue de cualquier otro fallo por código.
- `src/lib/crdtText.ts` (nuevo): helpers puros de Yjs — puerto de
  `noteContentSync.ts` de desktop, generalizado para servir a Note y
  DailyEntry (mismo algoritmo, ver `applyTextEdit`) ya que el único
  cambio real entre las dos es DÓNDE se persiste el estado (eso vive
  en cada `db/*.ts`, no acá) — **sin dependencias de SQLite a
  propósito**, mismo motivo que separó `syncApi.ts`/`syncMapping.ts`/
  `syncQueue.ts` en la Fase 2 (evita un ciclo de import con
  `db/notes.ts`/`db/dailyEntries.ts`).
- `src/lib/contentSyncQueue.ts` (nuevo): puerto de la cola de
  contenido de desktop — mapa coalescente por `entidad:key`, no FIFO
  (cada guardado nuevo pisa al anterior, el estado Yjs ya viaja
  completo y acumulativo). `AsyncStorage` en vez de `localStorage`.
- `src/lib/syncMapping.ts`/`syncApi.ts`: agregado el mapeo de
  metadata de Note (`NOTE_FIELD_MAP`: title/folder/tags/created/
  updated/pinned — `content`/`content_state` quedan afuera a
  propósito, van por el canal CRDT) y el tipo `DailyEntryApiResponse`
  (sin mapeo de metadata: DailyEntry es PUT-only, sin campos LWW
  aparte del contenido). `SyncEntityType`/`syncQueue.EntityType`
  extendidos con `'note'`/`'daily_entry'`.
- `src/db/notes.ts`: mismo patrón que la Fase 2 (push/apply dentro del
  propio archivo, evita el ciclo con `syncEngine.ts`) más el canal de
  contenido — `pushNoteContent()` (carga el `Y.Doc` persistido,
  diffea contra su texto actual con `applyTextEdit`, persiste,
  empuja) y `applyRemoteNoteContentState()` (aplica un update
  entrante, conmutativo/idempotente, reescribe `notes.content` si
  cambió). `createNote` NO empuja contenido (una nota nueva siempre
  arranca vacía, evita un round-trip de un `Y.Doc` vacío sin
  propósito); `updateNote` empuja metadata (diffeada) y contenido
  (si cambió) por separado, cada uno por su canal.
- `src/db/dailyEntries.ts`: mismo canal de contenido, sin metadata
  separada — `upsertDailyEntry` es la única puerta de entrada
  (`app/daily/[date].tsx` no necesitó ningún cambio, sigue llamándola
  igual que antes). `softDeleteDailyMonth` (borrado masivo de un mes)
  confirmado leyendo el código real de desktop: **tampoco sincroniza
  nada ahí**, es puramente local — mobile replica ese mismo
  comportamiento (no sincronizar), no es un corte de alcance propio.
- `src/lib/syncEngine.ts`: `APPLY_BY_TYPE` extendido con `note`/
  `daily_entry`; `dispatchQueuedWrite` extendido con Note (create/
  patch/delete) y DailyEntry (solo delete, el contenido no pasa por
  esta cola); nueva `drainContentSyncQueue()` (drena la cola de
  contenido, separada de `drainSyncQueue`); el polling ahora drena
  las 2 colas antes de reconciliar.
- **Bug real encontrado y corregido de paso (no introducido en esta
  fase, ya existía desde la Fase 2)**: `dispatchQueuedWrite` (el
  reenvío de una escritura que quedó en cola) nunca aplicaba la
  respuesta del servidor de vuelta al estado local tras un create/
  patch exitoso — a diferencia del envío directo (que sí lo hace vía
  `applyTaskResponse`/etc.). Cualquier normalización o merge
  concurrente que el servidor hubiera hecho quedaba sin reflejarse
  localmente después de drenar la cola offline. Se corrige exportando
  `applyTaskResponse`/`applyOvertimeEntryResponse`/
  `applyOvertimeMonthMetaResponse`/`applyAbsenceDayResponse` (antes
  privadas a cada `db/*.ts`) y llamándolas desde `dispatchQueuedWrite`
  — mismo comportamiento que desktop, que sí las aplica ahí.

### Desviación positiva del plan original: los editores no cambiaron

El plan original decía "mantener un `Y.Doc` por nota/día abierto" en
`app/note/[id].tsx`/`app/daily/[date].tsx` — replicando el patrón de
desktop, donde `NoteEditor.tsx` mantiene un `Y.Doc` vivo en memoria
durante toda la sesión de edición. Al implementar se encontró una
simplificación real: como el autoguardado de mobile ya debounce a
600ms (Notes) o guarda por operación discreta (Dailys) — nunca
tecla-por-tecla directo — no hace falta un `Y.Doc` persistente en el
componente de React. Cada llamada a `updateNote`/`upsertDailyEntry`
recarga el `Y.Doc` persistido desde SQLite, diferencia contra su
texto actual, aplica, persiste y empuja — mismo patrón que ya usa
`pushDailyContentUpdate` en desktop (que tampoco mantiene un doc vivo
por componente, a diferencia de `NoteEditor.tsx`). Resultado: **ningún
archivo bajo `app/` cambió en esta fase** — toda la complejidad CRDT
quedó encapsulada en `db/notes.ts`/`db/dailyEntries.ts`, detrás de las
mismas funciones que las pantallas ya llamaban. Reduce el riesgo real
de esta fase bastante por debajo de lo anticipado en el plan.

## `Task.progress` (agregado 2026-10-29)

Campo nuevo del contrato (logday-server#15), dentro del mismo mapeo
LWW de Task: va siempre en el create, en el PATCH solo si cambió
(`null` lo borra), y la clave ausente en una respuesta o en
`/sync/changes` cuenta como `null`. La cola offline no cambia. Detalle
en [`progreso-tasks/design.md`](../progreso-tasks/design.md).

## Colas sin pérdidas (nov 2026)

La auditoría del 9 nov 2026 (U-08) encontró que `sendQueuedWrite`
trataba cualquier 4xx como fallo permanente. Con la sesión vencida, o
el dispositivo revocado desde otro cliente, `withSyncAuth` desconecta y
relanza el 401, y la primera escritura de la cola se descartaba: podía
ser un create hecho sin conexión, y entonces los patch siguientes
recibían 404 y también se descartaban. Ahora usa `isPermanentSyncError`,
el mismo criterio que ya tenía la cola de contenido: 401, 408 y 429
cortan el drenado y la escritura espera.

Al probarlo aparecieron dos carreras más en las colas, las dos de
lectura → cambio → escritura sobre AsyncStorage:

- `syncQueue.drainQueue` guardaba, tras cada envío, la copia de la cola
  con la que había arrancado. Todo lo encolado mientras tanto (por
  ejemplo, una edición cuyo envío directo falló) se borraba sin
  mandarse. Ahora `dequeue` relee la cola guardada.
- `contentSyncQueue.drain` borraba la entrada `entidad:key` sin mirar si
  era la que se mandó (Q-17). Si mientras viajaba se guardó un estado
  más nuevo, ese se borraba. Ahora solo se borra si `queuedAt` y
  `updateB64` coinciden con lo enviado.

Las dos colas serializan sus lecturas y escrituras con `withKeyLock`
(una clave por cola) y tienen un solo drenado a la vez: si el polling,
la vuelta a primer plano y la reconexión coinciden, comparten el mismo
drenado en vez de mandar dos veces las mismas escrituras. El candado no
se sostiene durante el envío, así que encolar nunca espera a la red.

Pruebas en `src/lib/syncQueue.test.ts`, `contentSyncQueue.test.ts` y
`syncEngine.test.ts`, con los mocks de módulos nativos en
`src/__mocks__/`. Contra el código anterior fallan 7 de las 19.

## Pull por páginas y pull único (nov 2026)

M-11 de la auditoría del 9 nov 2026 (Q-36) proponía aplicar cada página
del pull en una transacción, porque un full resync de miles de cambios
se aplicaba en autocommit (lento) y, si la app moría a mitad, volvía a
empezar desde cero. Lo que se hizo:

- **Cursor por página.** `reconcileSync` ya no junta todo el delta en
  memoria: trae una página, la aplica y guarda el cursor con su último
  `seq`, y sigue. El servidor ordena cada página por `seq`
  (`changesSince` en logday-server), así que lo anterior a ese `seq` ya
  está aplicado. Si la app muere, el próximo pull sigue desde la última
  página completa. Tras un 410 el cursor vuelve a 0 y se trae todo,
  también página por página.
- **WAL** (ver `esquema-datos/design.md`): es lo que hace barata cada
  escritura en autocommit.
- **Un solo pull a la vez** (también parte de A-10). El polling, los
  avisos de `/ws` y la vuelta a primer plano lanzaban pulls en
  paralelo que aplicaban lo mismo dos veces y podían dejar el cursor
  por detrás de lo aplicado. Ahora, si llega un pedido con uno en curso,
  se corre uno más al terminar, y solo uno aunque lleguen varios. El
  debounce de los avisos y la supresión del eco siguen pendientes (A-10).
- El motor espera `whenDbReady()` antes de tocar la base.

**Sin transacción por página, a propósito.** `withTransactionAsync`
hace `BEGIN` en la única conexión de la app, así que las escrituras del
usuario que caigan mientras se aplica la página entran en esa
transacción: un `ROLLBACK` las borraría y, hasta el `COMMIT`, no están
en disco. `withExclusiveTransactionAsync` abre otra conexión, pero
obliga a pasar el `txn` por todos los `applyRemote*` de `src/db/*` (y
sus lecturas). Además, las escrituras de la conexión principal fallan
con "database is locked" mientras dura, y un `applyRemote*` que espera
el `withKeyLock` de una entidad que el usuario está guardando se
trabaría con ella. Aplicar la página a medias no corrompe nada: cada
cambio es idempotente y el cursor no pasa de la última página completa.
Si hiciera falta más velocidad, el siguiente paso es pasar el `txn` por
`src/db/*`, no un `BEGIN` compartido.

Pruebas: `src/lib/syncEngine.pull.test.ts` (páginas, cursor tras un
fallo, 410, pull único) y `src/db/index.test.ts` (migraciones sobre
`node:sqlite`, con el mock de `src/__mocks__/expo-sqlite.ts`).

## Fase 4 — subida inicial (nov 2026)

**Por qué hace falta.** Con el sync apagado (antes de conectar por
primera vez o tras cerrar sesión, también cuando la sesión vence) los
`sync*` de `src/db/*` no hacen nada: lo creado se queda solo en SQLite
y nada lo encola. Al conectar, el pull trae lo del servidor pero nada
subía lo local. Además, un daily de antes de la Fase 3 (texto sin
`content_state`) **perdía su texto** cuando el pull traía ese mismo día
desde otro cliente: `applyRemoteDailyEntryChangeLocked` pisa `content`
y el merge CRDT no tenía nada local que conservar.

**Cómo funciona** (`src/lib/syncInitialUpload.ts`):

1. `syncConnect` marca la subida como pendiente (`AsyncStorage`) antes
   de pasar a "conectado".
2. El siguiente pull (`reconcileOnce`, que es único gracias al pull
   único) ve la marca y, en vez del pull incremental:
   - siembra el estado CRDT de las notas y dailys con texto que no lo
     tienen (`seedMissing*ContentStates`), con el mismo criterio que
     ya usan los editores al tocar una fila así;
   - toma una foto de lo local: claves vivas de las 6 entidades y el
     estado CRDT de notas y dailys;
   - pone el cursor en 0 y hace un pull completo, página por página,
     anotando de cada cambio su clave, si es un borrado y el vector de
     estado de su contenido;
   - recorre la foto local y sube lo que falta con las mismas funciones
     que el envío normal (`uploadLocal*`, que usan `syncCreate*`): lo
     que falle queda en las colas.
3. Al terminar quita la marca. Si algo lanza, la marca queda y se repite
   entera en el próximo pull; lo ya subido aparece como "ya existía".

**Reglas** (las de la migración de Desktop, `syncMigration.ts`):

- Solo se sube lo que el servidor no tiene por su clave. Nunca se pisa
  lo que existe allá: una task, un registro de horas extra, una ausencia
  o los datos del colaborador de un mes que ya están en el servidor se
  quedan como están, y el pull ya los dejó así en el teléfono.
- Lo borrado en el servidor no se sube (el pull ya lo borró aquí), y lo
  borrado en el teléfono tampoco.
- Notas y dailys se mezclan en vez de saltarse, porque el contenido es
  CRDT. Si el estado local tiene inserciones que el vector de estado
  del servidor no cubre (`hasInsertsMissingFrom`), se manda el estado
  local, que tras el pull ya incluye el del servidor. El resultado tiene
  el texto de los dos lados. Desktop, en cambio, salta la nota si el
  servidor ya tiene contenido.

**Diferencias con Desktop, a propósito:**

- Es automática al iniciar sesión, no un botón. En un teléfono nadie
  va a buscar "migrar datos" en Ajustes, y el caso real es "la usé sin
  servidor y ahora lo conecto".
- Las claves del servidor salen del mismo `/sync/changes` desde 0 y no
  de los listados por entidad (`GET /tasks`, etc.): una sola descarga,
  incluye los borrados y no hace falta agregar 6 funciones de API.

**Límites conocidos:**

- Lo que se **edita** sin sesión en algo que ya estaba en el servidor no
  se sube: esta subida solo crea lo que falta y agrega texto a notas y
  dailys. Arreglarlo de raíz es no apagar el sync cuando vence la
  sesión, sino seguir encolando hasta que se vuelva a iniciar
  (pendiente aparte).
- Al iniciar sesión con **otra cuenta**, se sube a ella todo lo que hay
  en el teléfono, incluido lo que había bajado de la cuenta anterior.
  Igual que el botón de Desktop.
- Cada inicio de sesión hace un pull completo desde 0.

Pruebas: `src/lib/syncInitialUpload.test.ts` corre el código real de
`src/db/*` sobre `node:sqlite` contra un servidor falso que pagina por
`seq`, responde 409 a un id repetido y mezcla el contenido con Yjs.

## Explícitamente pendiente

- Diseño detallado de la Fase 4 — se escribe en este mismo archivo al
  arrancar.
- Panel de dispositivos/sesiones (listar/revocar) — fast-follow, no
  bloquea que sync funcione.
- **Verificación en vivo pendiente de la Fase 2** (no cubierta
  todavía): mismo push/pull para OvertimeMonthMeta (colaborador/
  cédula) y AbsenceDay; el drenado de la cola offline tras reconectar
  wifi; LWW por campo real (editar el mismo registro en dos campos
  distintos desde mobile y desde otro cliente a la vez, confirmar que
  ningún cambio se pierde).
- **Verificación en vivo pendiente de la Fase 3**: crear/editar/borrar
  una Note en mobile, confirmar en desktop/web (metadata Y contenido);
  editar el contenido de la misma nota desde mobile y desde desktop
  casi al mismo tiempo, en partes DISTINTAS del texto — confirmar que
  el merge conserva ambas ediciones (no que gana la última); mismo par
  de pruebas para un DailyEntry; poner el teléfono en modo avión,
  escribir bastante en una nota, reconectar — confirmar que el
  contenido llega completo, no solo el último fragmento (la cola de
  contenido coalesce, así que solo se manda el estado final, no cada
  guardado intermedio — comportamiento esperado, no un bug si el
  historial intermedio no aparece en otros clientes).
