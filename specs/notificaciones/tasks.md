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
- [ ] Probar en el build de desarrollo de la fase 2: pedir el permiso al
      encender, recibir el resumen a la hora elegida, tocarlo y caer en
      el Inicio, y que cambie al completar una tarea.
- [ ] En la beta: un teléfono Xiaomi o Samsung con ahorro de batería.
