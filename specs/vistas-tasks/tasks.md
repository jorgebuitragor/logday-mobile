# Vistas de Tasks — Tareas

Estado: Calendario y Kanban implementados, pendientes de confirmación
en vivo.

## Selector de vista + Calendario (agregado 2026-08-30)

- [x] `app/(tabs)/index.tsx`: selector Lista/Calendario (segmented
      control); `viewMode === 'calendar'`
      renderiza `TaskCalendarView` dentro de un `ScrollView` en vez del
      `FlatList` de siempre.
- [x] `src/components/TaskCalendarView.tsx` (nuevo): grilla mensual
      propia (no reusa `AppCalendarGrid`, ver design.md), puntos de
      estado por día, panel de tasks del día seleccionado.
- [x] i18n: `taskList.viewList`/`viewCalendar`/`noTasksDate` en
      es/en. Paridad verificada (198 = 198).
- [x] `./node_modules/.bin/tsc --noEmit` sin errores.
- [x] Bundle de Metro pedido directo, sin errores de resolución
      (`TaskCalendarView`/`CalendarRange` aparecen resueltos).
- [ ] Verificar en vivo: navegar entre meses; tocar días con y sin
      tasks; confirmar colores de los puntos por estado; tocar una
      task del panel navega a la pantalla correcta; el selector
      Lista/Calendario cambia de vista sin perder los datos cargados.

## Persistencia del selector (agregado 2026-08-30)

- [x] `src/settings/PreferencesContext.tsx`: `tasksViewMode`/
      `setTasksViewMode` (persistido en `AsyncStorage`); `TasksViewMode`
      movido acá desde una definición local (`ViewMode`) en
      `app/(tabs)/index.tsx`.
- [x] `app/(tabs)/index.tsx`: usa `usePreferences()` para el
      `viewMode` en vez de `useState` local.
- [x] `./node_modules/.bin/tsc --noEmit` sin errores.
- [x] Bundle de Metro pedido directo, HTTP 200.
- [ ] Verificar en vivo: dejar la app en Calendario, cerrarla del
      todo y reabrirla — debe seguir en Calendario.

## Kanban (agregado 2026-08-30)

- [x] `src/components/TaskKanbanBoard.tsx` (nuevo): 3 secciones por
      estado (Por hacer/En progreso/Hecho) apiladas verticalmente con
      `flex: 1` cada una, scroll vertical propio por sección, contador
      de tarjetas, arrastre táctil entre secciones vía Reanimated
      shared values + `Gesture.Race(Tap, Pan.activateAfterLongPress(250))`
      + fantasma flotante en `Modal` + `measureInWindow` sobre 3 refs
      al soltar. Ver design.md para el detalle de cada decisión.
- [x] Rediseño de columnas horizontales a secciones verticales
      (2026-08-30, mismo día): feedback directo tras probar la primera
      versión — "es muy difícil moverlo entre las tres columnas" — el
      usuario propuso el rediseño ("tres filas secciones verticales, en
      lugar de secciones horizontales"), implementado reemplazando el
      `ScrollView` horizontal + `width: 80%` por columna con un `View`
      vertical de 3 secciones `flex: 1`, siempre visibles a la vez sin
      depender de ningún scroll para alcanzarlas. Ver design.md.
- [x] Decidido: sin reordenar dentro de una columna — desktop tampoco
      persiste un orden manual (soltar solo cambia `status`, confirmado
      en `KanbanBoard.tsx` de desktop). Soltar en otra columna llama
      `onStatusChange(task, status)`.
- [x] `src/components/TaskStatusIcon.tsx` (nuevo): extraído de
      `renderStatusIcon`/`STATUS_COLOR` locales en `index.tsx` al
      necesitarse en las tarjetas del Kanban también.
- [x] `src/settings/PreferencesContext.tsx`: `TasksViewMode` extendido
      a `'list' | 'calendar' | 'kanban'`.
- [x] `app/(tabs)/index.tsx`: tercera opción en el selector de vista
      (`viewOptions`), tercera rama de render (`TaskKanbanBoard`),
      `handleKanbanStatusChange`, fila de la vista Lista usa
      `TaskStatusIcon` en vez del `renderStatusIcon` local eliminado.
- [x] i18n: `taskList.viewKanban`/`kanbanEmptyColumn` en es/en.
      Paridad verificada (256 = 256).
- [x] `./node_modules/.bin/tsc --noEmit` sin errores.
- [x] Bundle de Metro pedido directo (Android, dev), sin errores de
      resolución reales (los 2 `grep` de "Unable to resolve module" que
      aparecen son template strings del propio código de manejo de
      errores de Metro, no errores reales — mismo patrón ya observado
      en checkpoints anteriores); `TaskKanbanBoard`/`TaskStatusIcon`/
      `viewKanban`/`kanbanEmptyColumn` aparecen resueltos en el bundle.
- [ ] Verificar en vivo: mantener presionada una tarjeta y arrastrarla
      a otra sección (incluyendo la más lejana, "Por hacer" → "Hecho")
      — debe cambiar de estado y persistir tras recargar la pantalla,
      sin necesitar ningún scroll para alcanzarla; soltar fuera de
      cualquier sección o sobre la misma sección de origen no debe
      cambiar nada; tocar una tarjeta con un toque corto (sin mantener
      presionado) debe navegar directo a la task, sin iniciar un
      arrastre; scroll vertical dentro de una sección con muchas tasks
      no debe afectar a las otras 2 secciones; el fantasma debe seguir
      el dedo sin parpadeos ni desfases de posición, incluso con el
      header nativo de la pestaña Tareas visible arriba; confirmar que
      las 3 secciones se ven usables (header + al menos 1-2 tarjetas)
      en una pantalla de tamaño típico.
