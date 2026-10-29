# Progreso de tareas — Tareas

Estado: implementado, pendiente confirmación en vivo.

- [x] `src/lib/taskProgress.ts`: validación, lectura del servidor y
      texto del formulario.
- [x] Migración local: `ensureColumn('tasks', 'progress', 'INTEGER')`
      en `initDb`. SQL probado con `sqlite3` (tabla vieja + `ALTER` +
      upsert con `ON CONFLICT`).
- [x] `Task`/`TaskInput`, lectura y escritura en `src/db/tasks.ts`
      (`createTask`, `updateTask`, `writeTaskRow`).
- [x] Mapeo de sync: create, PATCH solo si cambió, respuesta y pull con
      ausente → `null`, `TASK_FIELD_MAP`.
- [x] UI: `TaskProgressBar` en la lista y el Kanban; campo en
      `TaskForm` con quitar y atajos; formulario desplazable con el
      teclado.
- [x] i18n es/en (`taskForm.progress*`, `taskList.progressLabel`).
- [x] `node scripts/verify-task-progress.mjs` (Node 24): validación y
      mapeo, 8 verificaciones.
- [x] `tsc --noEmit`, `npm run lint` (sin warnings nuevos) y bundle de
      Metro Android/iOS sin errores de resolución.
- [ ] Verificar en vivo contra un servidor con logday-server#15: crear
      con y sin progreso, cambiarlo, quitarlo, editarlo offline y
      drenar; ver que llega a Desktop/Web.
- [ ] Verificar en vivo el teclado en el formulario (Android
      edge-to-edge e iOS) y la barra en temas claro y oscuro.
