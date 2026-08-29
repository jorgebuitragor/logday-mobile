# Selector de hora — Requirements

Estado: implementado.

## Contexto

`horaInicio`/`horaFinal` de Overtime usaban `TextInput` de texto libre
`HH:MM` — reducción de alcance documentada en
`pantalla-overtime/requirements.md`. A diferencia del selector de
fecha, **desktop no tiene un componente propio de hora** —
`OvertimeEditor.tsx` usa el `<input type="time">` nativo del
navegador, así que no hay nada que portar acá. Se construyó desde
cero, con el mismo lenguaje visual que `AppDatePicker` (botón-trigger
+ modal centrado con tokens de tema), para que la app se sienta
consistente aunque esta pieza puntual no venga de un port — mismo
criterio pedido para el selector de fecha ("con el diseño de la app"),
extendido acá porque no hay una referencia de desktop que copiar.

## Requisitos (EARS)

- El sistema DEBERÁ ofrecer un componente `AppTimePicker` (botón con
  la hora formateada `HH:MM` + modal con selección de hora y minuto)
  en `src/components/AppTimePicker.tsx`.
- El componente DEBERÁ usar los tokens de tema para todos sus
  colores, mismo criterio que el resto de la app.
- Los minutos DEBERÁN seleccionarse en pasos de 5 (00, 05, 10, ...,
  55), no minuto a minuto — reduce la lista a un tamaño manejable para
  tocar en pantalla; no hay evidencia de que Overtime necesite
  precisión al minuto exacto.
- El sistema DEBERÁ reemplazar los campos `horaInicio`/`horaFinal` de
  `OvertimeForm` (`pantalla-overtime/`) por este componente.
- El panel del selector NO DEBERÁ cambiar de tamaño al interactuar —
  mismo criterio que se corrigió para el selector de fecha
  (`selector-fecha/design.md`, "Grilla de alto fijo").

### Formato 12h/24h (agregado 2026-08-29)

- El sistema DEBERÁ ofrecer, en el tab de Ajustes, una elección entre
  formato 24 horas y 12 horas (AM/PM) — sin equivalente en desktop
  (usa el formato del SO/navegador automáticamente); default **24
  horas**, mismo formato en que ya se guarda `HH:MM` en
  `overtime_entries`.
- El componente `AppTimePicker` DEBERÁ mostrar y permitir seleccionar
  la hora según esa preferencia (columna 1-12 + AM/PM, o columna 0-23)
  — el valor que entrega (`onChange`) DEBERÁ seguir siendo siempre
  `HH:MM` en 24 horas sin importar la preferencia, para no tocar el
  esquema de datos ni `overtimeCalc.ts`.
- Cambiar la preferencia DEBERÁ aplicar de inmediato a cualquier
  `AppTimePicker` abierto después del cambio — es una preferencia
  global (`PreferencesContext`), no por pantalla.

## Fuera de este spec

- Selección de segundos — ningún campo actual los usa.

