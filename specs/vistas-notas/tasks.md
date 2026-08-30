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
