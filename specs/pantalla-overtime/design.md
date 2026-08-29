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

## Explícitamente pendiente

Ver "Fuera de este spec" en `requirements.md`.
