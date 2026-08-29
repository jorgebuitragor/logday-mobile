# Pantalla de Overtime — Requirements

Estado: implementado, pendiente de confirmación en vivo.

## Contexto

Cuarto y último spec de pantalla por entidad del MVP original.
`task-manager/src/components/overtime/OvertimeEditor.tsx` y
`src/lib/overtimeCalc.ts` son la referencia — el cálculo de horas
extra (diurnas/nocturnas/festivas, festivos colombianos) se porta
**exacto**, no se reinventa.

## Requisitos (EARS)

### Cálculo

- El sistema DEBERÁ calcular `totalHoras`, `extrasDiurnas`,
  `extrasNocturnas`, `extrasDiurnasFestivas`, `extrasNocturnasFestivas`
  a partir de `fecha`/`horaInicio`/`horaFinal`, con el mismo algoritmo
  minuto a minuto que desktop (diurno 06:00–19:00, festivo = domingo o
  festivo colombiano vía el algoritmo de Butcher para Pascua + Ley
  Emiliani) — puerto exacto de `overtimeCalc.ts`/`colombianHolidays.ts`,
  ver `design.md`.
- El sistema NO DEBERÁ permitir editar directamente los campos
  calculados — se recalculan siempre a partir de fecha/horas.
- El sistema DEBERÁ mostrar el desglose calculado como preview en
  vivo mientras el usuario edita fecha/horas, antes de guardar.

### Formulario

- El sistema DEBERÁ permitir editar: fecha, hora inicio, hora final,
  solicitada por, actividad realizada (obligatoria), y un selector de
  3 opciones para `observaciones` (compensatorio/pago/otro) — mismos
  campos que `OvertimeEditor.tsx`.
- El sistema NO DEBERÁ usar un time-picker nativo para las horas —
  campo de texto libre `HH:MM`, mismo criterio de reducción de alcance
  que `due` en `pantalla-tasks/` (sin evidencia de que sea un problema
  real todavía).

### Listado y eliminación

- El tab "Overtime" DEBERÁ mostrar los registros no eliminados,
  ordenados por fecha descendente, con fecha, rango horario y total de
  horas visibles en la fila.
- El sistema DEBERÁ permitir eliminar (soft-delete) con confirmación
  según `confirmacion-eliminar/requirements.md`.

## Fuera de este spec

- Detección de conflictos de horario superpuesto el mismo día
  (`findConflicts` en `OvertimeEditor.tsx`) — desktop lo tiene, mobile
  no todavía. Reducción de alcance explícita, no un descuido.
- Exportar a Excel (`overtimeExcel.ts`).
- Vista de preview/resumen mensual (`OvertimePreviewModal.tsx`).
- `overtime_month_meta` (colaborador/cédula por mes) — sin pantalla
  todavía.
