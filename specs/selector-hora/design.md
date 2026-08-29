# Selector de hora — Design

Estado: implementado — ver `src/components/AppTimePicker.tsx`.

## Estructura

Dos columnas (`TimeColumn`, componente interno del archivo): horas
(`0`-`23`) y minutos (`0`, `5`, ..., `55`), cada una un `ScrollView`
de alto fijo (`ROW_HEIGHT * 5`, muestra 5 filas visibles) con
`snapToInterval` para que el scroll "encaje" fila por fila. Tocar una
fila selecciona ese valor (resaltado con `theme.accentSoft`/
`theme.accent`) sin cerrar el modal — a diferencia del calendario de
fecha (donde un solo tap ya define la fecha completa), acá hacen
falta dos selecciones independientes (hora y minuto), así que el modal
se cierra con un botón "Guardar" explícito, no al tocar.

Al abrir el modal, ambas columnas hacen scroll automático (sin
animación, `requestAnimationFrame` tras montar) hasta la hora/minuto
actual del valor recibido — evita que el usuario tenga que desplazarse
a mano hasta, por ejemplo, las 18:00.

## Por qué pasos de 5 minutos

Con minuto a minuto la columna tendría 60 filas — mucho scroll para
un valor que en la práctica siempre se ajusta a intervalos redondos.
Si una entrada existente tiene un minuto que no cae en un múltiplo de
5 (creada en desktop antes de este cambio, sin esa restricción), el
picker no la selecciona exactamente al abrir (el scroll queda entre
dos filas) — caso borde aceptado, no se le puso solución especial
porque `overtimeCalc.ts` sigue aceptando cualquier `HH:MM` válido
igual, esto es solo una limitación de la UI de selección, no del dato
almacenado.

## Reuso

`src/components/OvertimeForm.tsx` — `horaInicio`/`horaFinal`:
`<AppTimePicker value={horaInicio} onChange={setHoraInicio} />` (mismo
patrón para `horaFinal`). No hay otro campo de hora en la app
todavía.

## Preferencia 12h/24h (agregado 2026-08-29)

`timeFormat: '24h' | '12h'` en `src/settings/PreferencesContext.tsx`
(mismo patrón que `confirmDestructiveActions`: estado + persistencia
en AsyncStorage, default `'24h'`), con su sección propia en Ajustes
(ícono `Clock`).

`AppTimePicker` lee `timeFormat` de `usePreferences()` y decide qué
columna de horas mostrar:

- `'24h'`: columna `0`-`23`, igual que antes.
- `'12h'`: columna `1`-`12` + una tercera columna angosta con dos
  botones `AM`/`PM` (no una lista scrolleable — solo 2 opciones, un
  `ScrollView` sería excesivo). `to12(hour24)`/`from12(hour12, period)`
  son las únicas dos funciones de conversión; el estado interno
  (`hour24`) sigue siendo siempre 24 horas — la columna de 12h y el
  AM/PM son una vista derivada, nunca la fuente de verdad, así que
  `onChange` (y por lo tanto lo que se guarda en `overtime_entries`)
  nunca depende de la preferencia activa.
- El botón-trigger también formatea según la preferencia
  (`formatTimeDisplay`): `"18:00"` en 24h, `"6:00 PM"` en 12h.

Cambiar la preferencia mientras el modal está cerrado no requiere
ninguna sincronización especial — `AppTimePicker` la lee en cada
render, así que el próximo `open` ya usa el formato nuevo.

## Explícitamente pendiente

Ver "Fuera de este spec" en `requirements.md`.
