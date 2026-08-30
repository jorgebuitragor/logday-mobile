# Vistas de Tasks — Design

Estado: Calendario implementado — ver `src/components/TaskCalendarView.tsx`,
`app/(tabs)/index.tsx`.

## Selector de vista, persistido (agregado 2026-08-30)

`viewMode` (`TasksViewMode`) pasó de estado local
(`useState` en `app/(tabs)/index.tsx`) a `PreferencesContext`
(`tasksViewMode`/`setTasksViewMode`), persistido en `AsyncStorage`
— mismo mecanismo que `confirmDestructiveActions`/`timeFormat`, ya
establecido ahí. Cambio contenido, tal como se anticipó al dejarlo
fuera de alcance la primera vez: mover el `useState` al contexto, sin
tocar SQLite ni el esquema local. Mismo tratamiento para Notes
(`notesViewMode`, ver `vistas-notas/design.md`) en el mismo cambio.

## `TaskCalendarView` — por qué no reusa `AppCalendarGrid`

`AppCalendarGrid` (`selector-fecha/`) ya existe y resuelve "grilla de
mes navegable con celdas por día", pero está diseñada para un modal
angosto de selección de fecha: celdas fijas de 32px, sin espacio para
nada más que el número del día. Acá la grilla ocupa el ancho completo
de un tab (celdas con `flexBasis: '14.28%'`, más altas, con una fila
de puntos de estado debajo del número) — un contexto visual
suficientemente distinto como para no forzar el mismo componente con
props condicionales; se reimplementó el mismo algoritmo de celdas (42
celdas fijas, mismo motivo: que el alto no salte entre meses de 4/5/6
semanas) como componente aparte.

`STATUS_DOT_COLOR` se redefine local acá (no se importa desde
`app/(tabs)/index.tsx`, que tiene su propio `STATUS_COLOR` no
exportado) — 3 líneas de duplicación, no se extrajo a un módulo
compartido todavía porque solo hay 2 consumidores y ambos son código
de presentación, no lógica de negocio.

## Panel del día seleccionado

Debajo de la grilla, no en un panel lateral como desktop (`w-72`
sidebar) — no hay espacio horizontal en una pantalla de teléfono en
vertical. Toda la vista Calendario (grilla + panel) vive dentro de un
`ScrollView` en `index.tsx` (no dentro de `TaskCalendarView`) porque
el panel puede crecer con la cantidad de tasks del día seleccionado y
necesita poder desplazar la grilla hacia arriba.

## Explícitamente pendiente

Ver "Fuera de este spec" en `requirements.md`.
- Verificación en vivo: navegar meses hacia adelante/atrás; tocar un
  día con tasks y confirmar que los puntos de color coinciden con el
  estado real de cada task; tocar una task del panel y confirmar que
  navega a la pantalla correcta; tocar un día vacío y confirmar el
  estado vacío; deseleccionar un día tocándolo de nuevo.
- **Kanban** — ver `tasks.md`, próximo checkpoint.
