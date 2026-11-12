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
- [ ] En el build de desarrollo de la fase 2 (Android): lo mismo, más
      tocar el resumen y caer en el Inicio, y que cambie al completar una
      tarea. No se probó tocarlo ni con la app en segundo plano.
- [ ] En la beta: un teléfono Xiaomi o Samsung con ahorro de batería.
