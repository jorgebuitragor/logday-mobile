# Selector de fecha — Design

Estado: implementado — ver `src/components/AppDatePicker.tsx`.

## Puerto de desktop

`AppCalendarGrid` es un puerto casi literal de la función del mismo
nombre en `task-manager/src/components/shared/AppDatePicker.tsx`:
mismo algoritmo de cálculo de celdas (`firstDay`/`daysInMonth`,
relleno de celdas vacías al inicio del mes), mismo uso de
`Intl.DateTimeFormat` con locale `es-CO`/`en-US` (según
`i18n.language`) para nombres de mes/día — no se reimplementó a mano
una tabla de nombres de mes.

Diferencia estructural con desktop (no de diseño visual, de mecánica
de apertura): desktop `AppDatePicker` abre un `<div>` posicionado
`absolute` justo debajo del botón trigger (dropdown). Mobile no tiene
una noción confiable de "espacio libre debajo" en una pantalla táctil
angosta, así que `AppDatePicker` abre un `Modal` centrado (mismo
patrón visual — overlay + panel redondeado — que `ConfirmDeleteModal`)
en vez de un dropdown anclado.

## Colores

Reutiliza los mismos tokens que el resto de la app (no una paleta
nueva para el calendario): día seleccionado = `theme.accentStrong` de
fondo + texto blanco; día de hoy (no seleccionado) = borde
`theme.accent`; día deshabilitado (más allá de `max`) = opacidad
reducida; resto = `theme.textPrimary`. Mismo criterio de color que
usa desktop (`bg-indigo-600` seleccionado, borde indigo para "hoy").

## Reuso en las 3 pantallas

- `src/components/TaskForm.tsx` — campo `due`: `<AppDatePicker value={due} onChange={setDue} allowClear />`
  (opcional, con botón para quitar la fecha).
- `src/components/OvertimeForm.tsx` — campo `fecha`:
  `<AppDatePicker value={fecha} onChange={setFecha} />` (obligatorio,
  sin `allowClear`).
- `app/(tabs)/dailys.tsx` — modal "otra fecha": usa directamente
  `AppCalendarGrid` (no el `AppDatePicker` completo, que ya trae su
  propio botón-trigger y modal) dentro del modal que ya existía en esa
  pantalla (con su propio botón que lo abre, el ícono `CalendarPlus`
  junto al FAB "Hoy") — evita anidar un modal dentro de otro modal.
  Tocar un día en la grilla navega directo a `/daily/<fecha>` y cierra
  el modal, sin paso de confirmación aparte (a diferencia de la
  versión anterior con input de texto + botón "Ir").

## Explícitamente pendiente

Ver "Fuera de este spec" en `requirements.md`.
