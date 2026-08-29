# Selector de fecha — Requirements

Estado: implementado.

## Contexto

Task (`due`), Overtime (`fecha`) y el modal "otra fecha" de Dailys
usaban cada uno un `TextInput` de texto libre `YYYY-MM-DD` — reducción
de alcance documentada explícitamente en sus specs respectivos ("sin
date-picker nativo"). El usuario pidió un componente de selección de
fecha real, con el diseño de la app, reusado entre pantallas en vez de
reinventarlo en cada una.

Se descartó el picker nativo del SO
(`@react-native-community/datetimepicker`): su apariencia (diálogo del
sistema en Android, rueda en iOS) no se puede re-temizar con los
tokens de la app — contradice "con el diseño de la app". En su lugar
se portó `AppDatePicker`/`AppCalendarGrid` de
`task-manager/src/components/shared/AppDatePicker.tsx`, que ya es un
calendario propio con los mismos tokens de color que el resto de
desktop — mismo criterio que el resto del proyecto: no inventar,
portar lo que ya existe.

## Requisitos (EARS)

- El sistema DEBERÁ ofrecer un componente de calendario reusable
  (`AppCalendarGrid`: navegación mes/año, nombres de día localizados,
  celda por día) y un componente completo con trigger
  (`AppDatePicker`: botón con la fecha formateada + modal con el
  calendario) — ambos en `src/components/AppDatePicker.tsx`, un único
  archivo, mismo criterio de organización que el `AppDatePicker.tsx`
  de desktop (grid + picker completo en el mismo módulo).
- Los tres puntos que hoy piden una fecha (Task `due`, Overtime
  `fecha`, selector de fecha de Dailys) DEBERÁN usar este componente
  compartido — no reimplementar un `TextInput` de fecha por separado.
- El componente DEBERÁ usar los tokens de tema (`useTheme()`) para
  todos sus colores — nunca valores hardcodeados, mismo criterio que
  el resto de la app.
- El componente DEBERÁ soportar un caso de fecha opcional (`due` de
  Task, que puede quedar sin valor) mediante un botón "Quitar fecha"
  visible solo cuando corresponde (`allowClear`).

## Fuera de este spec

- Selector de rango de fechas (dos fechas, inicio/fin) — ningún campo
  actual lo necesita.
- Selector de hora — `horaInicio`/`horaFinal` de Overtime siguen como
  texto libre `HH:MM`, no se pidió selector para eso.
- Restricción `min` (fecha mínima seleccionable) — solo se portó `max`
  de desktop porque ningún campo actual necesita un mínimo.
