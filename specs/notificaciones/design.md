# Notificaciones de vencimientos — Design

- `src/lib/dueDigest.ts` (puro): `planDueDigests(tasks, now, hhmm)` arma
  un resumen por día con `due` de hoy y vencidas (`due` anterior),
  saltando hoy si la hora ya pasó y los días sin nada. Identificador
  estable `due-digest-YYYY-MM-DD`. `digestBody` arma el texto con los
  plurales de i18n.
- `src/lib/dueNotifications.ts`: la parte con expo-notifications.
  - Preferencias en AsyncStorage (`dueDigestEnabled`, `dueDigestTime`).
  - `rescheduleDueDigests` borra solo las notificaciones con el prefijo
    propio y programa el plan con un trigger `DATE` en el canal
    `due-digest`. Corre una a la vez; si se pide otra mientras corre, se
    repite una vez al terminar.
  - `startDueDigestScheduling`, desde `ReadyEffects` en
    `app/_layout.tsx`, un componente que se monta junto al `Stack` con la
    base lista (con `useRouter` en el layout raíz, que mientras abre la
    base no tiene navegador, Expo Router avisaba de un setState sobre
    `ContextNavigator` sin montar): reprograma al arrancar, al terminar un pull
    (`onPullFinished`, que emite `reconcileSync`), al cambiar una tarea
    (`onLocalTaskChange`, desde `src/db/tasks.ts`) y al volver al frente.
    Los tres últimos con un debounce de 1,5 s. Al tocar una notificación
    navega a su `data.url` (`/`, el Inicio).
- Ajustes: sección "Notificaciones" con el interruptor y, encendido, la
  hora (`AppTimePicker`). Si el permiso se niega, un `Alert` ofrece
  `Linking.openSettings()`.
- `app.json`: plugin `expo-notifications` con el ícono monocromo y el
  color de la marca. El permiso `POST_NOTIFICATIONS` viene del
  manifiesto de la librería; no se pide `SCHEDULE_EXACT_ALARM`. Sin ese
  permiso, la librería programa con `setAndAllowWhileIdle` (inexacto).
- Canal de Android: si `setNotificationChannelAsync` falla (Expo Go en
  Android lo rechaza), se programa en el canal por omisión en vez de
  cancelar todo.

## Por qué por adelantado y no en segundo plano

Programar 7 días y reprogramar en cada ocasión evita una tarea en
segundo plano (más permisos, más batería, y en iOS poco fiable). Los
números de un día futuro son los de hoy; cualquier cambio antes de que
llegue los corrige al reprogramar. Si la app no se abre en 7 días, los
resúmenes se acaban, y eso es aceptable.

## Riesgos

- Las capas de ahorro de batería de algunos fabricantes (Xiaomi,
  Samsung) retrasan o eliminan notificaciones programadas: probar en al
  menos un teléfono de esas marcas en la beta.
- En Expo Go, las notificaciones locales deberían funcionar en Android,
  pero la prueba que cuenta es la del build propio (fase 2).
