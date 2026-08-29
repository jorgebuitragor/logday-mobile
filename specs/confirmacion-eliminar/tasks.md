# Confirmación antes de eliminar — Tareas

Estado: implementado, pendiente de confirmación en vivo.

- [x] `src/settings/PreferencesContext.tsx` (`confirmDestructiveActions`,
      default `true`, persistido).
- [x] `src/hooks/useConfirmDelete.ts` (puerto exacto).
- [x] `src/components/ConfirmDeleteModal.tsx` (RN `Modal`).
- [x] Toggle en `app/(tabs)/settings.tsx`, sección "Comportamiento",
      mismo texto que desktop.
- [x] Integrado en las 8 rutas que eliminan (4 listas con swipe + 4
      pantallas de edición con botón "Eliminar").
- [x] `npx tsc --noEmit` sin errores.
- [ ] Verificar en vivo: con el toggle activado, eliminar pide
      confirmación; desactivado, elimina directo; la elección persiste
      tras cerrar y reabrir la app.
