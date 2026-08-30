# Pantalla de Overtime — Requirements

Estado: implementado (incluye desglose/colaborador/preview/detalles
de lista, agregado 2026-08-30), pendiente de confirmación en vivo.

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
- `fecha` DEBERÁ usar el selector de fecha compartido (agregado
  2026-08-29, ver `selector-fecha/requirements.md`) — ya no es texto
  libre.
- `horaInicio`/`horaFinal` DEBERÁN usar el selector de hora compartido
  (agregado 2026-08-29, ver `selector-hora/requirements.md`) — ya no
  son texto libre. No es un time-picker nativo del SO (mismo criterio
  que `fecha`: no se puede re-temizar), es un componente propio nuevo
  (desktop tampoco tiene uno propio de hora que portar, usa el
  `<input type="time">` nativo del navegador).

### Listado y eliminación

- El tab "Overtime" DEBERÁ mostrar los registros no eliminados,
  ordenados por fecha descendente, con fecha, rango horario y total de
  horas visibles en la fila.
- El sistema DEBERÁ permitir eliminar (soft-delete) con confirmación
  según `confirmacion-eliminar/requirements.md`.
- El listado DEBERÁ mostrar un estado vacío con ícono (`EmptyState` +
  `Timer`, el mismo ícono que usa desktop en `OvertimeList.tsx` para su
  empty state y que ya usa mobile en el tab bar) en vez de solo texto
  plano (agregado 2026-08-29).
- El listado DEBERÁ agrupar las entradas por mes (encabezado con
  nombre de mes + año y el total de horas de ese mes), igual que el
  "Total del mes" de `OvertimeList.tsx` en desktop, pero como un único
  historial continuo con scroll en vez de la navegación mes-a-mes
  (flechas prev/next) de desktop — adaptación táctil, ver `design.md`
  (agregado 2026-08-29).

### Conflictos de horario

- El sistema DEBERÁ detectar, al guardar, si el rango horario nuevo se
  cruza con otro registro existente el mismo día — puerto exacto del
  algoritmo de `findConflicts` en `OvertimeEditor.tsx` (intervalos
  `[start, end)`, excluyendo la propia entrada en edición).
- Si hay conflictos, el sistema DEBERÁ mostrar un diálogo listando los
  registros en conflicto (rango horario + actividad/solicitante) con
  dos acciones: revisar el horario (cerrar el diálogo sin guardar) o
  guardar de todas formas. Versión mobile-apropiada del modal de
  conflicto de desktop, no pixel-idéntica (agregado 2026-08-29).

## Requisitos (EARS) — Desglose, colaborador y preview (agregado 2026-08-30)

Pedido directo del usuario, en una ronda de "pulir pantalla por
pantalla" empezando por Overtime: "falta el desglose automático
general de las extras del mes, visible sin tener que abrir una
extra... la opción de editar datos de usuario para incluir en el
reporte, la previsualización del reporte en sí. Y la inclusión de más
detalles en la lista." Revierte 3 de los puntos que este spec había
dejado explícitamente fuera (ver versión anterior de "Fuera de este
spec").

- El encabezado de cada sección de mes DEBERÁ mostrar, además del
  total ya existente, el desglose completo (diurnas, nocturnas,
  diurnas festivas, nocturnas festivas) — visible siempre, sin
  necesidad de abrir ningún registro ni el menú "⋮".
- El menú "⋮" de cada mes DEBERÁ ofrecer "Datos del colaborador"
  (nombre completo + cédula), editables por mes y persistidos en
  `overtime_month_meta` — hasta ahora esa tabla solo se leía
  (rellenada por sync desde desktop), sin forma de escribirla desde
  mobile.
- El menú "⋮" de cada mes DEBERÁ ofrecer "Vista previa", que muestra
  todas las entradas del mes con el mismo detalle que llevará el
  Excel exportado (fecha, horario, solicitante, actividad,
  observaciones, y el desglose de horas de cada entrada) más los
  totales del mes, con un botón para exportar directo desde ahí.
- Cada fila del listado DEBERÁ mostrar, además de lo que ya mostraba
  (fecha, horario, actividad, total): quién la solicitó
  (`solicitadaPor`) y la observación (compensatorio/pago/otro/texto
  libre) si existe, como un pequeño distintivo — mismo contenido que
  ya se ve en la vista previa y en el Excel, ahora también visible sin
  abrir el registro.

## Fuera de este spec

- Exportar a Excel (`overtimeExcel.ts`) — implementado en
  `exportacion/requirements.md`, no acá.
