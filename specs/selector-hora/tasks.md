# Selector de hora — Tareas

Estado: implementado, pendiente de confirmación en vivo.

- [x] `src/components/AppTimePicker.tsx` (columnas hora/minuto,
      pasos de 5 minutos, scroll automático al valor actual).
- [x] Reusado en `OvertimeForm.tsx` (`horaInicio`, `horaFinal`).
- [x] `timeFormat` en `PreferencesContext.tsx` (default `24h`,
      persistido).
- [x] Sección "Formato de hora" en Ajustes (24h / 12h).
- [x] `AppTimePicker` cambia de columna (0-23 vs 1-12 + AM/PM) y de
      formato del trigger según la preferencia, sin afectar el valor
      `HH:MM` (24h) que entrega `onChange`.
- [x] `npx tsc --noEmit` sin errores.
- [ ] Verificar en vivo: elegir hora y minuto en 24h, cambiar la
      preferencia a 12h en Ajustes, reabrir el picker y confirmar que
      muestra la misma hora en formato 12h + AM/PM correcto; guardar
      un registro de Overtime en modo 12h y confirmar que el desglose
      de horas extra sigue calculando bien (el valor guardado sigue
      siendo 24h).
