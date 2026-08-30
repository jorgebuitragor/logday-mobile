# Vistas de Notes — Tareas

Estado: implementado, pendiente de confirmación en vivo.

- [x] `src/components/ViewSwitch.tsx` (nuevo, extraído de
      `app/(tabs)/index.tsx`, genérico en el tipo de modo).
- [x] `app/(tabs)/index.tsx`: actualizado para usar el `ViewSwitch`
      extraído (sin cambio de comportamiento).
- [x] `app/(tabs)/notes.tsx`: `viewMode` local ('list'/'grid', sin
      persistir); split `pinnedNotes`/`otherNotes` (solo para
      cuadrícula); rama de render con `ScrollView` + `flexWrap`
      (grilla manual, no `FlatList numColumns` — ver design.md) con
      secciones "Destacadas"/"Otras".
- [x] `NoteCard` (nuevo, local a `notes.tsx`): tarjeta con título,
      preview más larga, meta compacta (carpeta + hasta 2 tags),
      envuelta en `SwipeableRow` (mismo camino de borrado que Lista).
- [x] i18n: `noteList.viewList`/`viewGrid`/`pinnedSection`/
      `othersSection` en es/en. Paridad verificada (202 = 202).
- [x] `./node_modules/.bin/tsc --noEmit` sin errores.
- [x] Bundle de Metro pedido directo, sin errores de resolución
      (`ViewSwitch`/`NoteCard`/`Grid2x2` aparecen resueltos).
- [ ] Verificar en vivo: cambiar entre vistas; filtros de
      carpeta/tag en Cuadrícula; destacar una nota la mueve a
      "Destacadas"; swipe-para-eliminar en una tarjeta; el botón "⋮"
      de una tarjeta abre el mismo menú que en Lista.

## Alineación de la grilla + persistencia (agregado 2026-08-30)

- [x] `app/(tabs)/notes.tsx`: `grid` cambia de `gap` a
      `justifyContent: 'space-between'` + `rowGap`; `cardWrap.width`
      de `47%` a `48%` — corrige que la fila no llegaba al mismo borde
      derecho que el `ViewSwitch` (reportado con captura).
- [x] `src/settings/PreferencesContext.tsx`: `notesViewMode`/
      `setNotesViewMode` (persistido en `AsyncStorage`, mismo
      mecanismo que `confirmDestructiveActions`); `NotesViewMode`
      movido acá desde una definición local en `notes.tsx`.
- [x] `app/(tabs)/notes.tsx`: usa `usePreferences()` para el
      `viewMode` en vez de `useState` local.
- [x] `./node_modules/.bin/tsc --noEmit` sin errores.
- [x] Bundle de Metro pedido directo, HTTP 200.
- [ ] Verificar en vivo: las tarjetas llegan hasta el borde derecho;
      dejar la app en Cuadrícula, cerrarla y reabrirla mantiene la
      vista.

## Columnas independientes en vez de filas (agregado 2026-08-30)

- [x] `app/(tabs)/notes.tsx`: `estimatedCardLines`/`splitIntoColumns`
      (reparto voraz por altura estimada); `NoteGrid` (nuevo,
      reemplaza el JSX duplicado de Destacadas/Otras) con 2 columnas
      `flex:1`; estilos `columns`/`column` reemplazan `grid`/`cardWrap`.
- [x] `./node_modules/.bin/tsc --noEmit` sin errores.
- [x] Bundle de Metro pedido directo, HTTP 200
      (`NoteGrid`/`splitIntoColumns`/`estimatedCardLines` resueltos).
- [ ] Verificar en vivo: notas de largo distinto no dejan huecos
      grandes entre tarjetas; las 2 columnas quedan razonablemente
      parejas en altura.
