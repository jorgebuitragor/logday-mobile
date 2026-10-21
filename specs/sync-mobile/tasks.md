# Sync con logday-server — Tareas

Estado: Fases 0, 1, 2 y 3 confirmadas en vivo (Fase 2 completa y Fase 3
el 21 oct 2026). Falta la Fase 4.

## Plan completo (referencia)

1. **Fase 0** — spike de viabilidad de Yjs en Hermes.
2. **Fase 1** — auth + pantalla de conexión (sin sincronizar ninguna
   entidad todavía).
3. **Fase 2** — sync de metadatos LWW: Task, OvertimeEntry,
   OvertimeMonthMeta, AbsenceDay.
4. **Fase 3** — Note y DailyEntry: metadatos (LWW) + contenido (Yjs
   CRDT).
5. **Fase 4** — migración inicial de datos preexistentes.

Cada fase termina en un checkpoint en vivo obligatorio contra un
`logday-server` real antes de avanzar a la siguiente — ver
`design.md` para el detalle de arquitectura de cada una.

## Fase 0 — Spike de Yjs en Hermes

- [x] `yjs` instalado (`npm install yjs`).
- [x] `isomorphic-webcrypto` instalado — dependencia real que falta
      declarar `yjs`/`lib0` para su entry point de React Native
      (encontrado por el bundle de Metro, no adivinado). Ver
      design.md, "Fase 0 — hallazgo real".
- [x] `src/lib/yjsSpike.ts` (temporal): función `runYjsSpike()` — crea
      2 `Y.Doc`, escribe texto en uno, codifica a base64, aplica al
      otro, compara el resultado.
- [x] Botón temporal en Ajustes ("Spike: Yjs en Hermes") que corre
      `runYjsSpike()` y muestra el resultado inline.
- [x] `./node_modules/.bin/tsc --noEmit` sin errores.
- [x] Bundle de Metro pedido directo — falló primero por la
      dependencia faltante (HTTP 500, error de resolución real, no de
      los template strings de Metro), resuelto instalando
      `isomorphic-webcrypto`; segundo intento HTTP 200 sin errores de
      resolución reales.
- [x] **Checkpoint en vivo (2026-08-30, confirmado con captura)**:
      "✓ OK — merge correcto ('Hola desde mobile'), update de 34
      bytes." Yjs corre bien en Hermes con `isomorphic-webcrypto`
      instalado. Único efecto secundario observado: un warning de
      LogBox no fatal de `asmcrypto.js` ("seems to be load from an
      insecure origin... MitM-attack") — falso positivo conocido de
      esa librería cuando corre empaquetada en vez de servida por
      script tag en un navegador; no afecta a Hermes/RN, no truena
      nada, el spike igual dio éxito. Documentado acá para que no se
      confunda con un problema real si vuelve a aparecer más adelante.
- [x] Tras el checkpoint: borrado `src/lib/yjsSpike.ts`, la sección
      temporal en `app/(tabs)/settings.tsx` y su import.

## Fase 1 — Auth + pantalla de conexión

- [x] `expo-secure-store` instalado (`npx expo install`), plugin
      agregado en `app.json` automáticamente.
- [x] `src/types/sync.ts` (nuevo): `SyncConfig`/`SyncConnectionStatus`.
- [x] `src/lib/syncApi.ts` (nuevo): `login`/`refreshToken`/
      `listDevicesRemote` vía `fetch`, `SyncApiError`,
      `normalizeServerUrl`.
- [x] `src/settings/SyncContext.tsx` (nuevo): `SyncProvider`/`useSync`
      — persistencia (tokens en `expo-secure-store`, resto en
      `AsyncStorage`), `syncConnect`/`syncDisconnect`/
      `checkConnection`/`withSyncAuth` (puerto del guard de refresh
      compartido + relectura de config fresca de desktop). Ver
      design.md.
- [x] `app/_layout.tsx`: `SyncProvider` agregado al árbol de
      providers.
- [x] `app/(tabs)/settings.tsx`: sección "Sincronización" —
      formulario de conexión / estado + acciones según
      `syncConnectionStatus`.
- [x] i18n: sección `sync.*` en es/en. Paridad verificada (276 = 276).
- [x] `./node_modules/.bin/tsc --noEmit` sin errores.
- [x] Bundle de Metro pedido directo, sin errores de resolución
      reales; `SyncProvider`/`useSync`/`withSyncAuth`/`SecureStore`
      aparecen resueltos.
- [x] **Checkpoint en vivo (2026-08-30, confirmado)**: conectado
      contra el `logday-server` local (`http://192.168.20.121:8080`,
      `admin@example.com`) — pasó a "Conectado", mostró correo/URL, y
      "Verificar conexión" completó bien ("verifiqué todo ok"). El
      caso del refresh automático tras 15 min de vencimiento del
      access token no se probó a propósito con espera — queda cubierto
      de forma natural una vez arranque el polling de 30s de la Fase
      2 (correrá el tiempo suficiente para ejercitarlo sin necesitar
      una espera dedicada).

## Fase 2 — Sync de metadatos LWW (Task/OvertimeEntry/OvertimeMonthMeta/AbsenceDay)

- [x] `src/lib/syncMapping.ts`: tipos + funciones de mapeo + `*_FIELD_MAP`
      para las 4 entidades. Ver design.md.
- [x] `src/lib/syncQueue.ts`: cola offline (`AsyncStorage`).
- [x] `src/lib/objectDiff.ts` (nuevo): `diffChangedFields` genérico,
      con comparación por valor para campos array (`tags`).
- [x] `src/lib/syncRuntime.ts` (nuevo): puente síncrono entre
      `SyncContext` y el código de sync fuera de React.
- [x] `src/lib/syncApi.ts`: agregado `syncChangesRemote` + REST de
      Task/OvertimeEntry/OvertimeMonthMeta/AbsenceDay (create/patch/
      delete).
- [x] `src/db/tasks.ts`/`overtime.ts`/`absences.ts`: cada función
      pública existente (`createTask`, `updateTask`,
      `updateTaskStatus`, `softDeleteTask`, sus equivalentes de
      overtime/absences) dispara el push correspondiente al final;
      `applyRemote<Entidad>Change` (usado por el pull) escribe con SQL
      directo para evitar el ciclo de import con `syncEngine.ts`. Ver
      design.md, "Dónde vive el push/apply de cada entidad".
- [x] `src/lib/syncEngine.ts` (nuevo): `reconcileSync`,
      `drainSyncQueue`, `startPolling`/`stopPolling` (30s).
- [x] `src/settings/SyncContext.tsx`: 2 `useEffect` nuevos —
      sincroniza `syncRuntime.ts` y arranca/para el polling según el
      estado de conexión.
- [x] `./node_modules/.bin/tsc --noEmit` sin errores (tras ajustar la
      restricción genérica de `diffChangedFields` de
      `Record<string, unknown>` a `object` — los tipos concretos de
      cada entidad no tienen index signature).
- [x] Bundle de Metro pedido directo, sin errores de resolución
      reales; `reconcileSync`/`startPolling`/`applyRemoteTaskChange`/
      `getSyncRuntime`/`diffChangedFields` aparecen resueltos.
- [x] **Checkpoint en vivo (2026-08-31, confirmado) — push y pull de
      Task**: se creó una Task ("Prueba") y una OvertimeEntry en
      mobile, confirmadas leyendo directo la base del servidor
      (`docker exec`/`docker cp` — el servidor corre en un contenedor
      Docker, no como proceso nativo del host, hallazgo de esta
      verificación). Para el pull, se editó la Task "Prueba" **vía la
      API del servidor directamente** (mismo camino que usaría
      desktop/web) y se confirmó en 2 pasos: (1) el cambio queda con
      `seq` nuevo y aparece con la forma correcta en `/sync/changes`
      (mismo endpoint que consume el polling de mobile); (2) el
      usuario confirmó en la pantalla de mobile que el título
      cambió a "Prueba (editada desde servidor)" sin tocar nada.
- [x] **Checkpoint en vivo (2026-10-21, confirmado) — resto de la
      Fase 2**: iOS Simulator con Expo Go (manejado con Maestro) contra un
      logday-server local, con logday-web como el otro cliente.
      AbsenceDay creada, editada y borrada en los dos sentidos.
      OvertimeMonthMeta (colaborador/cédula) en los dos sentidos. Cola
      offline: con el servidor caído se editaron una task, el contenido
      de una nota y un daily, y al volver el servidor el polling los
      mandó todos. LWW por campo: Web cambia un campo y Mobile otro del
      mismo registro, y se conservan los dos.
- [x] **Bugs encontrados en ese checkpoint y corregidos**:
      - "Datos del colaborador" abría vacío aunque el mes tuviera datos:
        los borradores se cargaban al abrir la hoja, antes de que
        terminara la consulta. Al guardar se borraba la cédula. Ahora se
        cargan al entrar al formulario.
      - OvertimeMonthMeta y AbsenceDay mandaban los dos campos al
        guardar: si otro cliente había cambiado uno, se revertía. Ahora
        reciben la base que mostró el formulario y guardan solo lo que
        cambió el usuario (mismo arreglo que Task y OvertimeEntry).

## Fase 3 — Note y DailyEntry: metadatos (LWW) + contenido (Yjs CRDT)

- [x] `src/db/index.ts`: `ensureColumn()` (primera migración real de
      este esquema) + `content_state TEXT` agregado a `notes`/
      `daily_entries`.
- [x] `src/lib/crdtText.ts` (nuevo): helpers puros de Yjs, sin
      dependencias de SQLite (evita ciclo de import).
- [x] `src/lib/contentSyncQueue.ts` (nuevo): cola coalescente por
      `entidad:key` (`AsyncStorage`).
- [x] `src/lib/syncMapping.ts`: mapeo de metadata de Note +
      `DailyEntryApiResponse`.
- [x] `src/lib/syncApi.ts`: REST de Note (metadata + contenido) y
      DailyEntry (contenido); `SyncEntityType` extendido.
- [x] `src/lib/syncQueue.ts`: `EntityType` extendido con `note`/
      `daily_entry`.
- [x] `src/db/notes.ts`: push/apply de metadata (mismo patrón que
      Fase 2) + canal de contenido CRDT (`pushNoteContent`/
      `applyRemoteNoteContentState`) + `applyRemoteNoteChange` (pull).
- [x] `src/db/dailyEntries.ts`: canal de contenido CRDT (sin metadata
      separada) + `applyRemoteDailyEntryChange` (pull).
- [x] `src/lib/syncEngine.ts`: `APPLY_BY_TYPE`/`dispatchQueuedWrite`
      extendidos con Note/DailyEntry; `drainContentSyncQueue()` nueva;
      polling drena las 2 colas antes de reconciliar.
- [x] **Fix de paso**: `dispatchQueuedWrite` no aplicaba la respuesta
      del servidor tras drenar un create/patch en cola (bug ya
      existente desde la Fase 2, no introducido acá) — se corrige
      exportando `applyTaskResponse`/`applyOvertimeEntryResponse`/
      `applyOvertimeMonthMetaResponse`/`applyAbsenceDayResponse` y
      llamándolas desde `dispatchQueuedWrite`. Ver design.md.
- [x] **Sin cambios en `app/`** — ni `note/[id].tsx` ni
      `daily/[date].tsx` necesitaron tocarse; toda la complejidad CRDT
      quedó encapsulada en `db/notes.ts`/`db/dailyEntries.ts`, detrás
      de las mismas funciones que las pantallas ya llamaban.
      Desviación positiva del plan original, ver design.md.
- [x] `./node_modules/.bin/tsc --noEmit` sin errores.
- [x] Bundle de Metro pedido directo, sin errores de resolución
      reales; `applyRemoteNoteChange`/`applyRemoteDailyEntryChange`/
      `pushNoteContentRemote`/`applyTextEdit`/`drainContentSyncQueue`
      aparecen resueltos.
- [x] **Checkpoint en vivo (2026-10-21, confirmado)**: mismo entorno
      que el de la Fase 2. Note creada, editada y borrada en Mobile y
      confirmada en Web (metadata y contenido). Edición casi simultánea
      del contenido desde Mobile y Web, en partes distintas: se conservan
      las dos (la nota y un DailyEntry). Offline: contenido escrito con
      el servidor caído llega completo al volver.
- [x] **Bugs encontrados en ese checkpoint y corregidos**:
      - Ninguna nota creada en Mobile con el sync activo llegaba al
        servidor. Mobile la crea con título vacío y logday-server
        responde 400 ("title is required"). La cola descartaba el create,
        los PATCH daban 404 y se ignoraban, y el contenido quedaba
        trabado en `contentSyncQueue` para siempre, frenando el drenado
        del resto. Ahora se manda "Sin título" (como Web y Desktop) y se
        deshace en el eco. Un 4xx de contenido ya no se encola ni frena
        la cola.
      - Las listas solo recargaban al recuperar el foco: lo que llegaba
        por sync no aparecía hasta cambiar de pestaña. Ahora recargan
        con cada cambio remoto de su entidad (`useReloadOnRemoteChange`).
      - UI: el encabezado de los modales de pantalla completa (lista de
        ausencias, vista previa de horas extra) quedaba bajo la barra de
        estado y la X no se podía tocar; el teclado tapaba las hojas con
        campos (colaborador, carpeta y tags de una nota); los chips de
        carpeta del listado de notas salían cortados o gigantes; la
        confirmación de borrar una ausencia no tenía mensaje.
- [ ] **Pendiente**: las notas creadas en Mobile antes de este arreglo
      quedaron solo en el teléfono (el servidor nunca las recibió). La
      migración de la Fase 4 tiene que cubrirlas.
