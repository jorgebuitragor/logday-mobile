# Vistas de Tasks — Tareas

Estado: Calendario implementado, pendiente de confirmación en vivo.

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

## Kanban — pendiente (próximo checkpoint)

- [ ] Diseñar el arrastre táctil entre columnas (Por hacer/En
      progreso/Hecho) — mismo tipo de problema que ya se resolvió para
      mover actividades entre paneles en Dailys (`DailyActivityList.tsx`,
      Reanimated shared values + `Modal` para el fantasma), pero acá
      con 3 columnas en vez de 2, y hay que decidir en cuál se soltó,
      no solo "adentro o afuera de un panel".
- [ ] Decidir si el drag además reordena dentro de una misma columna
      (desktop sí lo permite) o solo mueve de estado (alcance menor).
- [ ] UI de columnas horizontales scrolleables (3 columnas no caben
      lado a lado en el ancho de un teléfono).
- [ ] Reusar el mismo selector de vista de `index.tsx` (agregar
      'kanban' a `TasksViewMode`, en `PreferencesContext.tsx`).
