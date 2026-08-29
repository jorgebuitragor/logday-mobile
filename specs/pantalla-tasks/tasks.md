# Pantalla de Tasks — Tareas

Estado: implementado, pendiente de confirmación en vivo por el
usuario.

- [x] Capa de datos `src/db/tasks.ts` (`listTasks`, `getTask`,
      `createTask`, `updateTask`, `softDeleteTask`), UUID vía
      `expo-crypto`.
      Satisface: "Creación"/"Edición" en `requirements.md`.
- [x] Reemplazar el placeholder de conteo en `app/(tabs)/index.tsx`
      por la lista real (`FlatList`), con botón flotante para crear.
      Satisface: "Listado" en `requirements.md`.
- [x] `app/task/new.tsx` y `app/task/[id].tsx` (crear/editar) usando
      el componente compartido `src/components/TaskForm.tsx`;
      `[id].tsx` incluye botón "Eliminar" (soft-delete).
      Satisface: "Creación"/"Edición" en `requirements.md`.
- [x] Declarar las rutas `task/new` y `task/[id]` como modal en
      `app/_layout.tsx` (antes era un `screenOptions` global).
- [x] Resolver el conflicto de instalación (`.npmrc` con
      `legacy-peer-deps=true`, ver "Nota de instalación" en
      `design.md`).
- [x] `npx tsc --noEmit` sin errores.
- [x] Agregar `scheme` (`logdaymobile`) a `app.json` — encontrado por
      el usuario como warning en runtime ("Linking requires a
      build-time setting `scheme`..."), necesario para que
      `expo-linking`/Expo Router funcionen en un build real (no solo
      en Expo Go).
- [ ] Verificar en vivo en el dispositivo Android del usuario: crear,
      editar y eliminar una task. Dev server corriendo en
      `exp://192.168.20.121:8081` (SDK 57, caché limpiada tras el
      cambio de `scheme`).

## Paridad funcional con desktop (agregado 2026-08-29)

- [x] `src/db/tasks.ts`: `TaskInput` gana `taskCode`/`tags`/`project`;
      `createTask`/`updateTask` los leen/escriben de verdad (antes
      hardcodeaban `NULL`/`'[]'`/`''`). Nueva `updateTaskStatus(id,
      status)` para el cambio rápido de estado desde el listado. Los
      tres (`createTask`/`updateTask`/`updateTaskStatus`) sellan/limpian
      `completed_at` en la transición a/desde `done`, mismo criterio
      que `appStore.updateTask` en desktop.
      Satisface: "`project`/`tags`/`taskCode` en el formulario" y
      "Cambio rápido de estado" en `requirements.md`.
- [x] `src/components/TaskForm.tsx`: agrega campos `project` (texto
      libre), `taskCode` (normalizado a mayúsculas, con chequeo de
      duplicado inline que bloquea el submit) y `tags` (chips +
      agregar/quitar). Traduce las etiquetas de estado (antes
      mostraba el valor crudo del enum sin pasar por `t()`).
- [x] `app/task/[id].tsx`: pasa los campos nuevos como `initialValue`
      y `currentId` (para excluir la task propia del chequeo de
      `taskCode` duplicado).
- [x] `app/(tabs)/index.tsx`: cada fila gana un ícono de estado
      táctil (cicla `todo`/`in-progress`/`done`) y una fila de
      metadatos (`taskCode`, `project`, `due` con aviso de vencida,
      hasta 3 `tags`) — antes solo mostraba título y el string crudo
      del estado.
      Satisface: "Contexto adicional en cada fila" en
      `requirements.md`.
- [x] `src/i18n/locales/{es,en}.json`: nuevas claves bajo `taskForm`
      (`statusTodo`/`statusInProgress`/`statusDone`, `project`,
      `projectPlaceholder`, `taskCode`, `taskCodePlaceholder`,
      `taskCodeHint`, `taskCodeDuplicate`, `tags`, `tagPlaceholder`,
      `addTag`, `removeTag`) — vocabulario copiado literal de la
      sección `tasks:` de `task-manager/src/lib/i18n.ts` donde el
      concepto coincidía.
- [x] `specs/pantalla-tasks/{requirements,design}.md` actualizados con
      los cambios de alcance de esta ronda.
- [x] `npx tsc --noEmit` sin errores atribuibles a estos cambios
      (el repo tenía en paralelo trabajo de otro agente en
      `OvertimeForm.tsx`/`app/(tabs)/overtime.tsx` con errores propios
      no relacionados con Tasks — ver nota abajo).
- [ ] Verificar en vivo en el dispositivo Android: crear/editar una
      task con `project`/`taskCode`/`tags`, ciclar el estado desde el
      listado, y confirmar el bloqueo de `taskCode` duplicado.

### Nota: directorio de trabajo compartido con otros agentes

Este checkout de `logday-mobile` resultó ser el mismo working tree que
usan en paralelo los agentes de Notes/Dailys/Overtime (no worktrees
git separadas, como sugería la consigna inicial) — `git status`
durante esta sesión mostró archivos modificados fuera de mi alcance
(`app/(tabs)/overtime.tsx`, `app/overtime/[id].tsx`,
`src/components/{EmptyState,NoteForm,OvertimeForm}.tsx`,
`src/db/notes.ts`) que nunca toqué. El commit de esta ronda hace
`git add` explícito solo de los archivos de Tasks (nunca `-A`) para no
incluir ese trabajo ajeno todavía en curso.
