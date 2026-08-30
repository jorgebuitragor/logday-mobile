# Pantalla de Overtime — Tareas

Estado: implementado, pendiente de confirmación en vivo.

- [x] `src/lib/colombianHolidays.ts` (puerto mínimo).
- [x] `src/lib/overtimeCalc.ts` (puerto exacto de `calcOvertimeBreakdown`).
- [x] `src/db/overtime.ts` (CRUD + cálculo al guardar).
- [x] `src/components/OvertimeForm.tsx` (campos + preview en vivo).
- [x] `app/(tabs)/overtime.tsx` — lista + swipe editar/eliminar.
- [x] `app/overtime/new.tsx` / `app/overtime/[id].tsx`.
- [x] Registrar rutas en `app/_layout.tsx`.
- [x] `npx tsc --noEmit` sin errores.
- [x] Empty state con ícono (`EmptyState` + `Timer`, agregado 2026-08-29).
- [x] Detección de conflictos de horario superpuesto al guardar, con
      modal de revisar/guardar de todas formas (`findConflicts` portado
      a `OvertimeForm.tsx`, agregado 2026-08-29).
- [x] Agrupación por mes con total de horas por mes en el listado
      (`SectionList` en vez de `FlatList`, agregado 2026-08-29).
- [ ] Verificar en vivo: crear un registro con horario que cruce
      06:00/19:00 y confirmar que el desglose diurno/nocturno tiene
      sentido; editar; eliminar.
- [ ] Verificar en vivo: crear dos registros el mismo día con horarios
      superpuestos y confirmar que aparece el modal de conflicto, y que
      "Guardar de todas formas" sí persiste la entrada.

## Desglose, colaborador, preview y detalles de lista (agregado 2026-08-30)

- [x] `app/(tabs)/overtime.tsx`: `MonthSection` con 4 campos de
      desglose nuevos, acumulados en `groupByMonth`; encabezado de
      sección en 2 líneas (título+total+"⋮", desglose completo debajo,
      siempre visible); fila de entrada con línea de `solicitadaPor` +
      pill de `observaciones`; fallback de actividad ahora
      `overtimeList.noDescription` en vez de `solicitadaPor`.
- [x] `src/db/overtime.ts`: `upsertOvertimeMonthMeta(yearMonth, colaborador, cedula)`
      (antes solo lectura).
- [x] `src/components/OvertimeMonthActionsSheet.tsx`: modo `'meta'`
      nuevo (campos nombre/cédula + Guardar); fila "Vista previa"
      (ícono `Eye`) que abre `OvertimePreviewModal`; props
      `colaborador`/`cedula`/`onSaveMeta`/`onPreview` nuevas.
- [x] `src/components/OvertimePreviewModal.tsx` (nuevo): modal de
      pantalla completa, lista de tarjetas (una por entrada, con
      desglose de 4 celdas cada una) + tarjeta de totales + Cerrar/Exportar.
- [x] `src/lib/overtimeLabels.ts` (nuevo): `observacionesLabel`
      extraído, compartido entre la fila de lista y el preview.
- [x] i18n: `common.close`; `overtimeList.noDescription`/
      `breakdownDay`/`breakdownNight`/`breakdownDayFest`/
      `breakdownNightFest`; `overtimeActions.preview`/
      `previewTotalsRow`/`collaboratorData`/
      `collaboratorNamePlaceholder`/`collaboratorIdPlaceholder`/
      `collaboratorHint` en es/en. Paridad verificada (214 = 214).
- [x] `./node_modules/.bin/tsc --noEmit` sin errores.
- [x] Bundle de Metro pedido directo, sin errores de resolución
      (`OvertimePreviewModal`/`upsertOvertimeMonthMeta`/
      `observacionesLabel` aparecen resueltos).
- [ ] Verificar en vivo: desglose de mes correcto; guardar y
      recuperar colaborador/cédula por mes; vista previa con datos y
      totales correctos; exportar desde la vista previa; detalles
      nuevos de cada fila (solicitante, observación) legibles.
