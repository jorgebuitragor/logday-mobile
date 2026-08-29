# Pantalla de Dailys — Tareas

Estado: implementado, pendiente de confirmación en vivo.

- [x] `src/db/dailyEntries.ts` (list/get/getPrevious/upsert/softDelete).
- [x] `src/lib/dailyCopyText.ts`.
- [x] `app/(tabs)/dailys.tsx` — lista + FAB "Hoy" + swipe editar/eliminar.
- [x] `app/daily/[date].tsx` — paneles Previo/Seleccionado, copiar
      formato, guardar, eliminar.
- [x] Registrar ruta `daily/[date]` en `app/_layout.tsx`.
- [x] `npx tsc --noEmit` sin errores.
- [ ] Verificar en vivo: crear el daily de hoy, ver el panel "Previo"
      con la entrada anterior, copiar formato y pegar en otra app,
      editar, eliminar.
