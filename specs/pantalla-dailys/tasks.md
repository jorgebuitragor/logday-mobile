# Pantalla de Dailys — Tareas

Estado: implementado, pendiente de confirmación en vivo.

- [x] `src/db/dailyEntries.ts` (list/get/getPrevious/upsert/softDelete)
      — sin cambios en esta revisión.
- [x] `src/lib/dailyCopyText.ts` — sin cambios de formato en esta
      revisión.
- [x] `src/components/DailyActivityList.tsx` (nuevo) — lista de
      actividades: añadir, editar in-line, reordenar (subir/bajar),
      eliminar; serialización compatible con `DailyEditor.tsx` de
      desktop.
- [x] `app/(tabs)/dailys.tsx` — lista + FAB "Hoy" + swipe
      editar/eliminar + ícono de estado vacío (`CalendarDays` vía
      `EmptyState`) + preview de fila basado en actividades parseadas.
- [x] `app/daily/[date].tsx` — reescrito: paneles "Previo" y
      "Seleccionado" como listas de actividades ambas editables,
      insignia "HOY", panel de vista previa del mensaje formateado,
      autosave por operación (sin botón "Guardar"), copiar formato,
      eliminar.
- [x] i18n: nuevas claves en `dailyForm` (`newActivityPlaceholder`,
      `moveUp`, `moveDown`, `deleteActivity`, `todayBadge`,
      `previewTitle`); claves `placeholder`/`save` retiradas por dejar
      de usarse (el textarea plano y el botón "Guardar" ya no
      existen).
- [x] `npx tsc --noEmit` sin errores.
- [ ] Verificar en vivo: crear el daily de hoy añadiendo varias
      actividades, reordenarlas con los botones subir/bajar, editar
      una actividad del panel "Previo", copiar el formato y pegarlo en
      otra app, eliminar una actividad individual, eliminar el daily
      completo.
