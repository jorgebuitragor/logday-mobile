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
