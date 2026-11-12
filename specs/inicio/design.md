# Inicio — Design

- `src/lib/homeSummary.ts`: `buildHomeSummary`, función pura que recibe
  lo leído de SQLite y la fecha de hoy. Así se prueba sin base ni reloj
  (`homeSummary.test.ts`).
  - Vencimientos: `due` es fecha de calendario `YYYY-MM-DD`, así que se
    compara como texto contra `todayISO()` (hora local).
  - Notas recientes: por `updated` con `stampSortKey`, porque mezcla
    instantes y fechas legadas.
  - Semana: lunes a domingo (`mondayOf`), con los festivos de los años
    que toque (una semana puede cruzar de año), la ausencia de cada día y
    la suma de `totalHoras` de horas extra.
- `app/(tabs)/index.tsx`: la pantalla. Carga con `useFocusEffect` y
  recarga con `useReloadOnRemoteChange` para las cinco entidades.
- Rutas: Tareas pasó de `app/(tabs)/index.tsx` a `app/(tabs)/tasks.tsx`.
  Ajustes pasó de pestaña (`app/(tabs)/settings.tsx`) a pantalla del
  stack (`app/settings/index.tsx`), al lado de Plantillas y Papelera. La
  cabecera del Inicio sobrescribe `headerRight` con búsqueda y engranaje.
  Ninguna otra ruta apuntaba a la pestaña de Ajustes.

## Alternativas descartadas

- **Sexta pestaña:** no cabe bien en un teléfono.
- **Inicio como pantalla aparte, con Tareas primero:** Jorge eligió que
  el Inicio sea lo primero que se ve al abrir.
