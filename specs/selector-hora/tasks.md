# Selector de hora — Tareas

Estado: implementado, pendiente de confirmación en vivo.

- [x] `src/components/AppTimePicker.tsx` (columnas hora/minuto,
      pasos de 5 minutos, scroll automático al valor actual).
- [x] Reusado en `OvertimeForm.tsx` (`horaInicio`, `horaFinal`).
- [x] `npx tsc --noEmit` sin errores.
- [ ] Verificar en vivo: elegir hora y minuto, confirmar con
      "Guardar", reabrir y ver que arranca en el valor ya elegido.
