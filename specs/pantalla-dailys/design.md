# Pantalla de Dailys — Design

Estado: implementado — ver `src/db/dailyEntries.ts`, `app/(tabs)/dailys.tsx`,
`app/daily/[date].tsx`, `src/lib/dailyCopyText.ts`.

## Capa de datos: `src/db/dailyEntries.ts`

- `listDailyEntries()` — no eliminados y `content != ''`, orden por
  `date DESC`.
- `getDailyEntry(date)` / `getPreviousDailyEntry(date)` — el segundo
  es `WHERE date < ? AND content != '' ORDER BY date DESC LIMIT 1`,
  la aproximación simplificada mencionada en `requirements.md`.
- `upsertDailyEntry(date, content)` — `INSERT ... ON CONFLICT(date) DO UPDATE`,
  mismo upsert que el endpoint del servidor.
- `softDeleteDailyEntry(date)`.

## `src/lib/dailyCopyText.ts`

Versión simplificada de `buildDailyCopyText` de desktop
(`task-manager/src/lib/colombianHolidays.ts`): mismo formato de
mensaje ("Buenos días. / El día X: / ... / El día de hoy, Y: / ..."),
sin el nombre del día de la semana en español (desktop lo formatea a
mano con arrays `DIAS`/`MESES`) — se usa la fecha ISO tal cual.
Copiado al portapapeles vía `expo-clipboard` (`Clipboard.setStringAsync`).

## Pantalla `app/daily/[date].tsx`

Dos paneles apilados (no lado a lado como desktop — pantalla angosta):
"Previo" (solo lectura, `getPreviousDailyEntry`) y "Seleccionado"
(`TextInput multiline` editable). Botones: "Copiar formato" (con
feedback "¡Copiado!" 1.5s), "Guardar" (upsert + volver), "Eliminar"
(con confirmación, ver `confirmacion-eliminar/`).

## Listado `app/(tabs)/dailys.tsx`

FAB con label "Hoy" (no ícono "+") — navega a `/daily/<fecha de hoy>`,
que puede ser una entrada nueva (vacía, se crea al guardar) o existente
(se abre para editar). No hay ruta `/daily/new` separada — la clave
natural (`date`) hace que "crear" y "editar" sean la misma pantalla,
a diferencia de Task/Note.

## Explícitamente pendiente

Ver "Fuera de este spec" en `requirements.md`.
