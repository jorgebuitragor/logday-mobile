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
- [ ] Verificar en vivo: crear un registro con horario que cruce
      06:00/19:00 y confirmar que el desglose diurno/nocturno tiene
      sentido; editar; eliminar.
