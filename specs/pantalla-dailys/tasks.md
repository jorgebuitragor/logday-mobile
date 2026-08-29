# Pantalla de Dailys — Tareas

Estado: implementado, pendiente de confirmación en vivo.

- [x] `src/db/dailyEntries.ts` (list/get/getPrevious/upsert/softDelete)
      — sin cambios en esta revisión.
- [x] `src/lib/dailyCopyText.ts` — sin cambios de formato en esta
      revisión.
- [x] `src/components/DailyActivityList.tsx` (nuevo) — lista de
      actividades: añadir, editar in-line, reordenar (subir/bajar),
      eliminar; serialización compatible con `DailyEditor.tsx` de
      desktop.
- [x] `app/(tabs)/dailys.tsx` — lista + FAB "Hoy" + swipe
      editar/eliminar + ícono de estado vacío (`CalendarDays` vía
      `EmptyState`) + preview de fila basado en actividades parseadas.
- [x] `app/daily/[date].tsx` — reescrito: paneles "Previo" y
      "Seleccionado" como listas de actividades ambas editables,
      insignia "HOY", panel de vista previa del mensaje formateado,
      autosave por operación (sin botón "Guardar"), copiar formato,
      eliminar.
- [x] i18n: nuevas claves en `dailyForm` (`newActivityPlaceholder`,
      `moveUp`, `moveDown`, `deleteActivity`, `todayBadge`,
      `previewTitle`); claves `placeholder`/`save` retiradas por dejar
      de usarse (el textarea plano y el botón "Guardar" ya no
      existen).
- [x] "Previo" = `date - 1` siempre (no la entrada no vacía más
      reciente) — `getPreviousDailyEntry` eliminado de
      `src/db/dailyEntries.ts`, reemplazado por `addDaysISO` en
      `src/lib/dates.ts` (nuevo, también consolida los 4 `todayISO()`
      duplicados que había en `dailys.tsx`/`daily/[date].tsx`/
      `overtime/new.tsx`/`AppDatePicker.tsx`). El panel "Previo" ya
      nunca muestra el mensaje `noPrevious` (clave retirada) — siempre
      es una `DailyActivityList` editable, exista o no contenido.
- [x] Mover actividades entre "Previo" y "Seleccionado" deslizando
      (`onMoveItemToOther`/`moveToOtherLabel` en
      `DailyActivityList.tsx`, mismo `Swipeable` que `SwipeableRow`).
- [x] i18n: nuevas claves `dailyForm.moveToSelected`/`moveToPrevious`.
- [x] Mantener presionado y arrastrar como segunda forma de mover
      entre paneles (agregado 2026-08-29, a pedido del usuario tras
      probar el swipe): ícono `GripVertical` por fila en
      `DailyActivityList.tsx` con `Gesture.Pan().activateAfterLongPress(300)`
      + `GestureDetector`; orquestación completa (refs de ambos
      paneles, `measureInWindow` para hit-testing, `splice`+`push` con
      `parseActivityItems`/`serializeActivityItems`) en
      `app/daily/[date].tsx`.
- [x] `npx tsc --noEmit` sin errores.
- [x] Corregido el mismo día (usuario reportó lentitud al arrastrar y
      el fantasma lejos del dedo): instalado
      `react-native-reanimated` + `react-native-worklets` (peer
      dependency de reanimated 4.x); reescrita la posición del
      fantasma con `useSharedValue`/`useAnimatedStyle` (hilo de UI, sin
      re-render de React en cada frame — ver design.md, "Por qué
      Reanimated") en vez de `useState`; el fantasma ahora se renderiza
      dentro de un `<Modal transparent statusBarTranslucent>` de React
      Native en vez de una `View absoluta` hija de la pantalla (el
      header del `presentation: 'modal'` de la navegación desplazaba
      las coordenadas — ver design.md). `npx tsc --noEmit` sin errores
      tras el cambio; dev server reiniciado con caché limpia (`expo
      start -c`, obligatorio tras instalar un paquete con plugin de
      Babel).
- [ ] Verificar en vivo: abrir un día sin daily previo registrado y
      confirmar que el panel "Previo" ya deja añadir actividades
      directo (no muestra el mensaje de "sin daily anterior"); deslizar
      una actividad de "Seleccionado" hacia "Previo" y viceversa y
      confirmar que se guarda en la fecha correcta en ambos lados;
      reordenar con subir/bajar sigue funcionando dentro de cada panel;
      mantener presionado el grip de una actividad y arrastrarla hasta
      el otro panel — confirmar que ahora sigue el dedo de cerca y sin
      lag, que se mueve solo si se suelta dentro de los límites del
      panel contrario (si se suelta afuera, no pasa nada y la actividad
      vuelve a su posición), que el swipe sigue funcionando normal para
      un deslizar rápido sin mantener presionado, y que el scroll de la
      pantalla se bloquea mientras se arrastra.
