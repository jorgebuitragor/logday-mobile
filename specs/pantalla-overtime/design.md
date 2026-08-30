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

## Desglose siempre visible en el encabezado (agregado 2026-08-30)

`MonthSection` (`app/(tabs)/overtime.tsx`) gana 4 campos
(`totalDiurnas`/`totalNocturnas`/`totalDiurnasFest`/`totalNocturnasFest`),
acumulados en `groupByMonth` junto al `totalHoras` que ya existía —
mismo patrón, sin una segunda pasada sobre las entradas. El
encabezado de sección pasa de una fila (`sectionHeader` en row) a una
columna con dos filas: la de siempre (título + total + "⋮") y una
nueva línea compacta debajo con las 4 categorías. Se decidió mostrar
las 4 siempre, no detrás de un toggle "expandir" — el pedido explícito
fue "visible sin tener que abrir una extra", un toggle habría vuelto a
esconder la información un paso.

## `upsertOvertimeMonthMeta` (agregado 2026-08-30)

`src/db/overtime.ts` gana la mitad de escritura que le faltaba a
`overtime_month_meta` (antes solo `getOvertimeMonthMeta`, de solo
lectura — ver `exportacion/design.md`). Upsert con
`ON CONFLICT(year_month) DO UPDATE`, mismo criterio que
`upsertDailyEntry`: la fila puede no existir todavía para un mes que
nunca se exportó ni configuró antes.

## Datos del colaborador y Vista previa en `OvertimeMonthActionsSheet` (agregado 2026-08-30)

La hoja "⋮" del mes gana un segundo modo (`'meta'`, junto al
`'actions'` que ya tenía) con dos campos (nombre, cédula) y un botón
Guardar — mismo patrón de modo-inline-con-formulario que
`NoteActionsSheet` ya usa para carpeta/tags de una nota. "Vista
previa" es una fila más en el modo `'actions'`, pero abre un
componente aparte (`OvertimePreviewModal`), no un modo dentro de la
misma hoja — necesita mucho más espacio (lista completa de entradas)
del que una hoja inferior puede dar cómodamente.

`app/(tabs)/overtime.tsx` mantiene dos pares de estado separados
(`actionsMonth`/`actionsMonthMeta` para la hoja, `previewSection`/
`previewMeta` para el modal de preview) en vez de reusar el mismo:
tocar "Vista previa" cierra la hoja (`onClose` limpia `actionsMonth`)
en el mismo instante en que se abre el preview, así que si el preview
leyera `actionsMonth` directo se quedaría sin datos apenas se abre. Se
capturan explícitamente (`setPreviewSection(actionsMonth)`) en el
momento del tap, antes de que la hoja los limpie.

`exportMonthSection(section)` es la función compartida que arma el
export a partir de una `MonthSection` cualquiera — usada tanto por el
botón "Exportar" de la hoja como por el de `OvertimePreviewModal`,
para no duplicar el `getOvertimeMonthMeta` + `exportOvertimeMonth` en
dos lugares.

## `OvertimePreviewModal` — tabla de desktop a tarjetas (agregado 2026-08-30)

`OvertimePreviewModal.tsx` de desktop es una tabla de 11 columnas
(fecha, solicitante, actividad, observaciones, hora inicio/final,
total, 4 columnas de desglose) — no cabe en el ancho de un teléfono
sin scroll horizontal, que además es una interacción incómoda en
táctil. Se adaptó a una lista de tarjetas: cada fila de la tabla es
una tarjeta con la misma información reorganizada verticalmente (fecha
+ horario + total arriba, actividad, solicitante + observación, y una
fila de desglose de 4 celdas abajo), más una tarjeta de totales al
final de la lista en vez de una fila de `<tfoot>`. Mismo dato, mismo
propósito ("ver exactamente lo que va a exportarse"), layout distinto
para el contexto móvil.

`Modal` de pantalla completa (`animationType="slide"`, sin
`transparent`), no una hoja inferior — necesita mostrar
potencialmente muchas entradas con scroll cómodo, a diferencia de las
hojas de acciones (pocas filas fijas) que sí usan el patrón de bottom
sheet en el resto de la app.

`observacionesLabel` (`src/lib/overtimeLabels.ts`, nuevo) — mismo
criterio que `COMP_KEYS` de desktop (`comp`/`pay`/`other` traducidos,
cualquier otro valor se muestra tal cual como texto libre), extraído
para compartirse entre `overtime.tsx` (badge de fila) y
`OvertimePreviewModal` (misma info en cada tarjeta).

## Más detalles en cada fila del listado (agregado 2026-08-30)

El fallback de la línea de actividad cambia de `item.solicitadaPor`
(mostrado ahí solo cuando no había actividad) a
`t('overtimeList.noDescription')` — mismo criterio que desktop
(`OvertimeList.tsx`/`OvertimePreviewModal.tsx`, `noDescription`).
`solicitadaPor` ahora tiene su propia línea, siempre visible cuando
existe (antes se perdía si había actividad, porque solo aparecía como
fallback). La observación se muestra como un pequeño pill junto a
`solicitadaPor`, mismo criterio visual que los chips de tag ya usados
en Notes.

## Explícitamente pendiente

Ver "Fuera de este spec" en `requirements.md`.
- Verificación en vivo (agregado 2026-08-30): el desglose del
  encabezado de mes suma correctamente; guardar colaborador/cédula
  desde la hoja y confirmar que persiste (reabrir la hoja del mismo
  mes debe mostrar los valores guardados); la vista previa muestra
  las entradas correctas del mes y sus totales coinciden con el
  encabezado; exportar desde la vista previa genera el mismo archivo
  que exportar desde la hoja; el pill de observación y la línea de
  solicitante se ven bien en una fila angosta.
