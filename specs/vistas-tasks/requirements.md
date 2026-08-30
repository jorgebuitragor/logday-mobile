# Vistas de Tasks — Requirements

Estado: Calendario implementado, pendiente de confirmación en vivo.
Kanban pendiente (próximo checkpoint).

## Contexto

Pedido directo del usuario: "falta añadir más vistas en tareas" (junto
con filtros/precisión de búsqueda, ver `busqueda/requirements.md`).
Desktop (`ViewMode = 'list' | 'kanban' | 'calendar'`, `appStore.ts`)
tiene 3 vistas para Tasks; mobile solo tenía la lista plana
(`pantalla-tasks/`). Se preguntó explícitamente cuál priorizar —el
usuario eligió "Ambas" (Kanban y Calendario) — así que este spec cubre
las dos, en dos checkpoints separados por el tamaño/riesgo de cada
una: Calendario primero (reusa patrones ya existentes, riesgo bajo),
Kanban después (arrastre táctil entre columnas, más grande).

Desktop's `CalendarView.tsx` combina la grilla de tasks-por-fecha con
un sistema aparte de "eventos de calendario" (recordatorios,
repetición, colores — `CalendarEvent`). Ese sistema de eventos es una
funcionalidad completamente distinta (mobile no tiene tabla
`calendar_events`, ni notificaciones locales configuradas) y el
usuario pidió "vistas", no un sistema de eventos nuevo — se deja fuera
de este spec, ver "Fuera de este spec".

## Requisitos (EARS) — Selector de vista

- La pantalla de Tasks DEBERÁ ofrecer un selector de vista (Lista /
  Calendario) visible en todo momento, no escondido en un menú.
- El selector DEBERÁ recordar la última vista elegida entre reinicios
  de la app (agregado 2026-08-30 — revierte la reducción de alcance
  original de esta sección; pedido explícito del usuario: "me
  gustaría también que las vistas se guarden así cierre la app").

## Requisitos (EARS) — Vista Calendario

- El sistema DEBERÁ mostrar una grilla mensual navegable (mes
  anterior/siguiente) con las tasks ubicadas en el día de su fecha de
  vencimiento (`due`), como puntos de color bajo el número del día —
  color según estado (`todo`/`in-progress`/`done`), hasta 3 puntos
  visibles + contador "+N" si hay más.
- Tocar un día DEBERÁ mostrar, debajo de la grilla, la lista de tasks
  con vencimiento ese día (o des-seleccionar si ya estaba
  seleccionado).
- Tocar una task en esa lista DEBERÁ navegar a su pantalla de edición
  — mismo destino que tocar una fila en la vista Lista.
- Un día sin tasks DEBERÁ mostrar un estado vacío al seleccionarlo, no
  quedar en blanco sin explicación.

## Fuera de este spec

- **Sistema de eventos de calendario** (`CalendarEvent`, recordatorios,
  repetición, colores por evento) — funcionalidad aparte de "vista de
  tasks por fecha", no pedida, sin tabla en el schema de mobile.
- **Tasks sin fecha de vencimiento** en la vista Calendario — no
  aparecen en ningún día (mismo criterio que desktop: solo tasks con
  `due` se ubican en la grilla). Siguen visibles en la vista Lista.
- Crear una task nueva ya con la fecha del día tocado precargada
  (desktop lo hace desde el menú contextual de una celda) — en mobile,
  el botón "+" ya existente sigue creando sin fecha, se completa
  dentro del formulario como cualquier otra task.
- **Kanban** — próximo checkpoint, ver `tasks.md`.
