# Pantalla de Overtime — Design

Estado: implementado — ver `src/lib/overtimeCalc.ts`,
`src/lib/colombianHolidays.ts`, `src/db/overtime.ts`,
`src/components/OvertimeForm.tsx`, `app/(tabs)/overtime.tsx`,
`app/overtime/new.tsx`, `app/overtime/[id].tsx`.

## Puerto exacto de la lógica de cálculo

`src/lib/colombianHolidays.ts` porta solo `getColombianHolidays`/`toISO`
de `task-manager/src/lib/colombianHolidays.ts` (187 líneas originales,
~80 portadas) — el resto (`isWorkingDay`, `getPreviousWorkingDay`,
`buildDailyCopyText`, etc.) no lo usa nada en mobile todavía.
`src/lib/overtimeCalc.ts` es un puerto **carácter por carácter** de la
función `calcOvertimeBreakdown` (mismo algoritmo minuto a minuto, sin
ninguna simplificación) — es la única pieza de este batch de trabajo
donde "mantener la funcionalidad de desktop" significaba literalmente
no cambiar nada.

`observaciones` en el esquema es `TEXT` libre, pero tanto desktop como
mobile lo usan como un enum de 3 valores fijos (`comp`/`pay`/`other`)
mostrados como botones — no hay `CHECK` en la columna (ni en el
servidor ni local), la restricción vive solo en la UI, igual que en
desktop.

## `src/db/overtime.ts`

`createOvertimeEntry`/`updateOvertimeEntry` llaman
`calcOvertimeBreakdown` antes de escribir — los 5 campos calculados se
persisten (no se recalculan on-the-fly en cada lectura), mismo patrón
que el servidor (columnas propias, no derivadas en la query).

## `OvertimeForm`

Comparte estructura con `TaskForm`/`NoteForm` (mismo patrón de
`initialValue`/`onSubmit`/`submitLabel`), con un preview en vivo del
desglose (`useMemo` sobre fecha/horas, recalcula en cada tecleo,
`try/catch` porque fechas/horas a medio escribir pueden no parsear).

## Conflictos de horario (agregado 2026-08-29)

`findConflicts`/`toMinutes` se portan carácter por carácter desde
`OvertimeEditor.tsx` (mismo algoritmo: convierte `HH:MM` a minutos y
compara intervalos `[start, end)`), pero viven en
`src/components/OvertimeForm.tsx` en vez de en la pantalla — el form
ya es el único punto donde se intenta guardar, y necesita el listado
completo de entradas para comparar contra la fecha/horas en edición.

`OvertimeForm` ahora carga todas las entradas (`listOvertimeEntries`)
al montar y, al presionar el botón de guardar, calcula conflictos
antes de llamar a `onSubmit`. Si hay conflictos, muestra un modal
(mismo patrón visual que `ConfirmDeleteModal`: overlay + panel, pero
con una lista de las entradas en conflicto) con dos botones: "Revisar
horario" (cierra el modal, no guarda) o "Guardar de todas formas"
(llama a `onSubmit` igual). No hay estado "guardando" con spinner —
desktop tampoco lo tenía en su forma exacta de la porción portada, y
el submit ya es prácticamente instantáneo en SQLite local.

`entryId` es un prop nuevo y opcional de `OvertimeForm` (solo lo pasa
`app/overtime/[id].tsx`) para excluir la propia entrada de la
comparación al editar — igual que `excludeId` en la función original
de desktop.

## Agrupación por mes y totales (agregado 2026-08-29)

`app/(tabs)/overtime.tsx` pasó de `FlatList` a `SectionList`,
agrupando las entradas (ya ordenadas por fecha DESC) por
`fecha.slice(0, 7)` en `groupByMonth`. Cada sección tiene un
encabezado con el nombre del mes + año (traducido vía
`overtimeList.months`, un array de 12 strings en el JSON de i18n — no
existía un helper de nombres de mes en mobile todavía, a diferencia de
`MONTHS_TITLE` en `task-manager/src/lib/i18n.ts`) y la suma de
`totalHoras` de esa sección, mostrada con la key `overtimeList.monthTotal`.

Desktop pagina un mes a la vez con navegación prev/next
(`loadOvertimeMonth`, `overtimeMonth` en el store). Mobile no replica
esa paginación: muestra el historial completo como una sola lista con
scroll y encabezados de sección — más natural en táctil que botones de
flecha, y el dato que importaba de esa parte de desktop (el total del
mes) se conserva igual. Se decidió no portar `overtimeMonth`
state/navegación por ahora.

## Ícono de empty state (agregado 2026-08-29)

`app/(tabs)/overtime.tsx` usa ahora `EmptyState` (mismo componente
compartido que `index.tsx` para tareas) con el ícono `Timer` de
`lucide-react-native` — confirmado contra
`task-manager/src/components/overtime/OvertimeList.tsx` línea 145,
que usa exactamente `Timer` (36px, `strokeWidth={1.5}`,
`text-faint`/`text-hint`) para su empty state de lista, coincidiendo
además con el ícono que mobile ya usaba en el tab bar.

## Explícitamente pendiente

Ver "Fuera de este spec" en `requirements.md`.
