# Confirmación antes de eliminar — Requirements

Estado: implementado, pendiente de confirmación en vivo.

## Contexto

Puerto de `task-manager/src/hooks/useConfirmDelete.ts` +
`ConfirmDeleteModal.tsx`: un modal de confirmación antes de cualquier
soft-delete, **configurable** desde Ajustes (no forzado). Aplica a las
4 entidades del MVP (Task, Note, Daily, Overtime) — mismo alcance que
la descripción del toggle en desktop ("Muestra un diálogo antes de
borrar notas, tareas, dailys y registros de extras").

## Requisitos (EARS)

- El sistema DEBERÁ ofrecer, en el tab de Ajustes, un toggle
  "Confirmar eliminaciones" — mismo texto/comportamiento que
  `settings.confirmDeleteTitle`/`confirmDeleteDesc` de desktop.
- El valor por defecto DEBERÁ ser **activado** — mismo default que
  desktop (`confirmDestructiveActions: true`).
- El sistema DEBERÁ recordar la elección entre sesiones (persistida,
  mismo patrón que tema/idioma).
- Cuando el toggle esté activado, toda acción de eliminar (desde el
  swipe de una lista o desde el botón "Eliminar" de una pantalla de
  edición) DEBERÁ mostrar un modal de confirmación antes de ejecutar
  el soft-delete.
- Cuando el toggle esté desactivado, eliminar DEBERÁ ejecutarse
  directo, sin modal — mismo comportamiento que
  `useConfirmDelete`/`directAction` en desktop.

## Fuera de este spec

- Confirmación para otras acciones destructivas que no sean eliminar
  (desktop también lo usa para temas personalizados, sync, etc. — no
  aplica a mobile todavía porque esas features no existen acá).
