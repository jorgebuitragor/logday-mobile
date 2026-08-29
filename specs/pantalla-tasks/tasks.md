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
