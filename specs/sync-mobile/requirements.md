# Sync con logday-server — Requirements

Estado: en progreso. Fase 0 y Fase 1 confirmadas en vivo. Fase 2
arrancando.

## Contexto

Mobile es hasta ahora CRUD 100% local sobre SQLite — decisión
explícita desde `arquitectura-inicial/` ("se espera a que desktop
quede validado end-to-end" antes de construir el cliente de sync de
mobile). Pedido directo del usuario, tras un repaso de "qué falta":
"Vamos con toda la sincronización, como desktop o web".

El protocolo ya existe del lado del servidor
(`logday-server/specs/sync-incremental/`, `auth-multiusuario/`,
`lww-por-campo/`) y desktop (`task-manager`) ya tiene un cliente
maduro, con bugs reales ya encontrados y corregidos en producción
(condiciones de carrera en refresh de tokens, respuestas tardías
pisando ediciones en cola, cola de contenido CRDT sin drenar). Este
spec porta esa arquitectura ya probada, no la rediseña desde cero —
ver `design.md` para el detalle de qué se porta de dónde.

El esquema local de mobile ya está listo para esto desde el día uno:
todas las tablas tienen `updated_at`/`deleted_at` (ver
`src/db/schema.ts`), no hace falta migrarlo.

Se construye en fases con checkpoint en vivo obligatorio entre cada
una (plan completo en la sesión que originó este spec, resumen abajo
y en `tasks.md`) — no se valida todo junto al final.

## Requisitos (EARS) — Fase 0: viabilidad de Yjs en Hermes

El contenido de Note y DailyEntry sincroniza vía CRDT (Yjs, mismo
formato que `ygo` del servidor y logday-web: `Y.Text` bajo la key
`"content"`). Yjs nunca se probó en el runtime de este proyecto
(React Native + Hermes) — es la única pieza de todo el plan con riesgo
real de inviabilidad técnica (podría faltar algún global del entorno
que Hermes no expone).

- El sistema DEBERÁ poder crear un `Y.Doc`, escribir texto en un
  `Y.Text`, codificar el estado como update binario, convertirlo a
  base64 y de vuelta, aplicarlo a un segundo `Y.Doc`, y confirmar que
  el contenido mergeado es el esperado — todo dentro del runtime real
  de la app (Hermes en el dispositivo), no en Node.
- Si falta algún polyfill, el sistema DEBERÁ poder resolverlo sin
  cambiar de librería CRDT — cambiar de Yjs implicaría perder
  compatibilidad de merge con desktop/web, que ya lo usan.

## Requisitos (EARS) — Fase 1: auth + pantalla de conexión

- El sistema DEBERÁ permitir conectar contra un `logday-server` con
  URL/correo/contraseña, sin sincronizar ninguna entidad todavía.
- El sistema DEBERÁ persistir la sesión (tokens + config) entre
  reinicios de la app — el usuario no debe tener que volver a
  ingresar sus credenciales cada vez que abre la app.
- Los tokens de acceso/refresh DEBERÁN guardarse cifrados
  (Keychain/Keystore vía `expo-secure-store`), no en texto plano.
- Cuando el access token venza (15 min), el sistema DEBERÁ renovarlo
  automáticamente con el refresh token en la siguiente llamada
  autenticada, sin que el usuario tenga que reconectar a mano.
- Si el refresh token también está vencido o revocado, el sistema
  DEBERÁ desconectar la sesión localmente y mostrar un mensaje claro
  — no debe fallar en silencio ni quedar en un estado ambiguo.
- El usuario DEBERÁ poder desconectar manualmente en cualquier
  momento, sin que eso borre ningún dato local.

## Requisitos (EARS) — Fases siguientes

Se detallan en `design.md`/`tasks.md` a medida que arranca cada fase
(Fase 2: sync de metadatos LWW para Task/OvertimeEntry/
OvertimeMonthMeta/AbsenceDay; Fase 3: Note/DailyEntry, metadatos +
contenido CRDT; Fase 4: migración inicial de datos preexistentes) —
no se escriben de antemano en detalle para no comprometerse a un
diseño antes de que cada checkpoint en vivo confirme los supuestos de
la fase anterior.

## Fuera de este spec

- **WebSocket en tiempo real** — desktop tampoco lo tiene todavía
  (usa un intervalo de polling de 30s, ver `appStore.ts` de
  `task-manager`); mobile iguala esa paridad real, no construye algo
  que ni siquiera desktop tiene.
- **Panel de dispositivos/sesiones** (listar/revocar desde mobile) —
  no bloquea que sync funcione, posible fast-follow tras la Fase 1.
- **CalendarEvent** — mobile no tiene tabla local para esa entidad
  (fuera de alcance ya documentado en specs anteriores).
