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
