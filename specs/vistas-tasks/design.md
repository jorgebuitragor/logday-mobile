# Vistas de Tasks — Design

Estado: Calendario implementado — ver `src/components/TaskCalendarView.tsx`,
`app/(tabs)/index.tsx`.

## Selector de vista, sin persistir

`viewMode: 'list' | 'calendar'` es estado local de
`app/(tabs)/index.tsx`, no vive en `PreferencesContext` ni en SQLite —
a diferencia de desktop, que persiste `currentView` en su store
global. Alcance reducido deliberado: persistirlo tocaría el esquema de
preferencias (una migración más) por un beneficio menor (recordar la
última vista entre reinicios de la app, no algo pedido explícitamente).
Si se pide después, es un cambio contenido: mover el `useState` a
`usePreferences()`.

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
