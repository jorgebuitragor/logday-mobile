# Notificaciones de vencimientos — Tareas

Estado: implementado, pendiente confirmación en un build propio.

- [x] `expo-notifications` (`npx expo install`, versión del SDK 57) y su
      plugin en `app.json`.
- [x] `src/lib/dueDigest.ts` con pruebas (5).
- [x] `src/lib/dueNotifications.ts` con pruebas (5) contra
      expo-notifications simulado y los textos reales de `es.json`.
      Fallan si se borran notificaciones ajenas o si deja de
      reprogramarse después de un pull.
- [x] Eventos `onPullFinished` (emitido por `reconcileSync`) y
      `onLocalTaskChange` (emitido por `src/db/tasks.ts`).
- [x] Sección en Ajustes y textos es/en.
- [x] En Expo Go, en el simulador de iOS (11 nov 2026): el permiso se
      pide solo al encender el interruptor; con una tarea de hoy se
      programan 7 resúmenes, y el de hoy llegó a la hora elegida como
      banner con la app abierta ("Tus vencimientos · 1 tarea vence hoy").
- [x] En Expo Go, en el emulador de Android (Pixel 8, Android 16, 12 nov
      2026): el permiso `POST_NOTIFICATIONS` se pide al encender, y el
      resumen llegó a la cortina ("Your due dates · 1 task is due today")
      dentro de la ventana de 2 minutos. Salieron y se corrigieron dos
      cosas: Expo Go rechaza el canal propio y eso cancelaba todos los
      resúmenes, y el aviso de setState sobre `ContextNavigator` al
      arrancar (ver design.md). En Expo Go, tocar el resumen abre la
      pantalla de inicio de Expo Go, no la app.
- [ ] En el build de desarrollo de la fase 2 (Android): tocar el resumen y
      caer en el Inicio, el canal propio, que cambie al completar una
      tarea y con la app en segundo plano.
- [ ] En la beta: un teléfono Xiaomi o Samsung con ahorro de batería.
