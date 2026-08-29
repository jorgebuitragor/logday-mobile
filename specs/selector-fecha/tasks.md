# Selector de fecha — Tareas

Estado: implementado, pendiente de confirmación en vivo.

- [x] `src/components/AppDatePicker.tsx` (`AppCalendarGrid` +
      `AppDatePicker`), puerto de `task-manager/src/components/shared/AppDatePicker.tsx`.
- [x] Reusado en `TaskForm.tsx` (`due`, con `allowClear`).
- [x] Reusado en `OvertimeForm.tsx` (`fecha`).
- [x] Reusado (solo `AppCalendarGrid`) en el modal "otra fecha" de
      `app/(tabs)/dailys.tsx`.
- [x] Simplificado el label de `taskForm.due` (ya no menciona
      `YYYY-MM-DD` — el formato ya no es visible para el usuario).
- [x] Grilla de alto fijo (42 celdas siempre) — corrige el salto
      visual al cambiar de mes reportado por el usuario.
- [x] `npx tsc --noEmit` sin errores.
- [ ] Verificar en vivo: elegir fecha en Task (y quitarla con "Quitar
      fecha"), en Overtime, y en "otra fecha" de Dailys; navegar entre
      meses y confirmar que el panel ya no cambia de alto; confirmar
      que el mes/día aparece en español (o inglés según el idioma
      activo).
