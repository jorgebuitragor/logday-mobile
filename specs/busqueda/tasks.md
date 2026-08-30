# Búsqueda global — Tareas

Estado: implementado, pendiente de confirmación en vivo.

- [x] `src/db/search.ts` (`searchAll`, 4 tablas, snippet, límite 10).
- [x] `app/search.tsx` (input + resultados agrupados + navegación).
- [x] Registrar ruta `search` en `app/_layout.tsx`.
- [x] Ícono de acceso en el header de tabs
      (`app/(tabs)/_layout.tsx`).
- [x] `npx tsc --noEmit` sin errores.
- [ ] Verificar en vivo: buscar un término presente en una task y en
      una nota, confirmar que aparece en ambos grupos y que tocar cada
      resultado navega a la pantalla correcta.

## Precisión y filtros (agregado 2026-08-29)

- [x] `src/db/search.ts`: campos ampliados por entidad
      (`task_code`/`project`/`tags` en tasks; `tags`/`folder` en
      notes; `observaciones` en overtime); `scoreMatch` (ranking por
      dónde coincidió); `SearchFilters`/`EMPTY_FILTERS`;
      `listSearchLabels()`.
- [x] `src/components/FilterChip.tsx` (nuevo, extraído de
      `app/(tabs)/notes.tsx` — mismo componente, ahora compartido).
- [x] `app/(tabs)/notes.tsx`: usa el `FilterChip` extraído, sin cambio
      de comportamiento.
- [x] `app/search.tsx`: panel de filtros colapsable (botón con
      contador), chips de sección/estado/proyecto-tag, rango de fecha
      con `AppDatePicker` (`allowClear`), botón "Limpiar filtros".
- [x] i18n: `search.filtersToggle`/`filtersClear`/`dateFrom`/`dateTo`
      en es/en. Paridad verificada (195 = 195).
- [x] `./node_modules/.bin/tsc --noEmit` sin errores.
- [x] Bundle de Metro pedido directo, sin errores de resolución
      (`FilterChip`/`listSearchLabels`/`SlidersHorizontal` aparecen
      resueltos).
- [ ] Verificar en vivo: cada filtro por separado y combinados; el
      contador del botón de filtros; que buscar un `taskCode`/tag/
      `observaciones` que antes no aparecía ahora sí aparece; que un
      match de título ordena antes que uno solo de contenido.
