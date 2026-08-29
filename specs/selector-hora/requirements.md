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

## Fuera de este spec

- Selección de segundos — ningún campo actual los usa.
- Formato de 12 horas (AM/PM) — se mantiene 24 horas, igual que el
  `<input type="time">` de desktop y que el formato `HH:MM` ya
  almacenado en `overtime_entries`.
