# Sync con logday-server — Tareas

Estado: Fase 0 confirmada. Fase 1 implementada, pendiente de
checkpoint en vivo.

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
- [ ] **Checkpoint en vivo**: conectar contra un `logday-server` real
      (URL/correo/contraseña de una cuenta existente) — confirmar que
      pasa a "Conectado" y muestra el correo/URL; cerrar la app del
      todo y reabrirla — debe seguir "Conectado" sin pedir credenciales
      de nuevo; tocar "Verificar conexión" — debe mostrar "Última
      verificación: ahora mismo"; esperar más de 15 minutos (vencimiento
      del access token) y tocar "Verificar conexión" de nuevo — debe
      seguir funcionando (el refresh debe correr solo, sin que el
      usuario note nada); tocar "Desconectar" — debe volver al
      formulario, sin que los datos locales (tasks/notes/etc.) se
      hayan tocado.
