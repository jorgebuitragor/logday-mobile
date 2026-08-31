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
  al conectar) que reemplaza el WebSocket en tiempo real que desktop
  tampoco tiene todavía — cada tick drena la cola antes de reconciliar
  (mismo motivo que desktop: sin esto una entrada quedaría en cola
  para siempre aunque la app siga "Conectado").
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
