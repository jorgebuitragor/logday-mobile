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

## Grilla de alto fijo (corregido 2026-08-29)

La primera versión generaba solo las celdas necesarias (relleno vacío
antes del día 1 + un día por celda), así que un mes de 4 filas y uno
de 6 filas hacían que el panel/modal cambiara de alto al navegar entre
meses — un salto visual que el usuario reportó. Corregido: `cells`
ahora siempre tiene 42 elementos (6 filas × 7 columnas) sin importar
el mes, calculado como `day = i - firstDay + 1` y `null` fuera de rango
`[1, daysInMonth]` (relleno tanto al inicio como al final). Este es el
mismo problema que desktop no tiene porque ahí el dropdown no está
dentro de un modal centrado — un cambio de alto en un dropdown que
"crece hacia abajo" no se nota igual que en un panel centrado en
pantalla, así que esta corrección es específica de mobile, no un port.

## Explícitamente pendiente

Ver "Fuera de este spec" en `requirements.md`.
