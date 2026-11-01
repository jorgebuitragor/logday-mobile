# Plantillas — Design

## Motores compartidos

`src/lib/templates/` es copia de `task-manager/src/lib/templates/`
(Desktop). Los motores no importan nada de la app, así que son el mismo
archivo en los tres clientes; si hay que corregirlos, se corrigen en los
tres.

- `dailyTemplate.ts`: subconjunto de Mustache escrito a mano
  (`renderTemplate`), el contexto del Daily (`dailyTemplateContext`),
  `DAILY_TEMPLATE_MARKERS` y `LOGDAY_DAILY_TEMPLATE`.
- `overtimeTemplate.ts`: llena un `.xlsx` sobre su XML con `fflate`
  (marcadores, fila de datos repetida, fórmulas y combinadas corridas).
- `logdayOvertimeXlsx.ts`: la plantilla genérica en base64, con
  `base64ToBytes`/`bytesToBase64` propios, sin `atob`/`btoa`.
- `choice.ts`: los tipos (`DailyTemplateSource`, `OvertimeTemplateSource`,
  `TemplatesConfig`) y `buildDailyMessage`. Igual que en Desktop salvo los
  comentarios de dónde se guarda: la de Logday delega en
  `buildDailyCopyText`, importado de `../colombianHolidays`.
- `dailyTemplate.ts` trae además `hoy.dia`, `DAILY_TEMPLATE_EXAMPLES` y
  `splitTemplate` (Desktop `b1595a0`).

Los motores compilan en Hermes: el bundle de `expo export` los pasa a
bytecode sin errores (usan `matchAll` y `\b`, sin lookbehind).

### El mensaje de siempre, igual que en Desktop

`dailyCopyText.ts` es copia de `buildDailyCopyText` de Desktop y se
reexporta desde `colombianHolidays.ts` (que además trae
`getPreviousWorkingDay` y `dateFromISO`), así que `choice.ts` y las
pruebas de los motores importan igual que en Desktop y la prueba "da lo
mismo que buildDailyCopyText" compara contra la función real de Mobile.
Antes de este cambio Mobile tenía una versión reducida (fechas ISO, día
anterior de calendario); ver `pantalla-dailys/design.md`.

## Persistencia

`src/settings/TemplatesContext.tsx`, mismo patrón que
`PreferencesContext`: estado en React y escritura a AsyncStorage en cada
cambio. El `.xlsx` se copia con `expo-document-picker`
(`copyToCacheDirectory: true`) y `File` de `expo-file-system` a
`documentDirectory`, no a la caché, que el sistema puede vaciar
(`src/lib/templateFiles.ts`).

## Conexión

- `app/daily/[date].tsx`: copiar y vista previa pasan por
  `buildDailyMessage`. El colaborador (`getOvertimeColaborador`) solo se
  consulta si la elegida es la propia.
- `src/lib/overtimeExport.ts`: Legacy sigue con `generateOvertimeXlsx` y el
  nombre "Reporte Extras …"; Logday y la propia llenan la plantilla y se
  llaman "Horas extra …", como en Desktop. Un fallo del motor o del archivo
  sale como `OvertimeTemplateError` y `app/(tabs)/overtime.tsx` lo muestra
  con `Alert`.
- `app/settings/templates.tsx`: puerto de `TemplatesSettingsTab.tsx`.
  El editor de la propia es un `TextInput` multilínea controlado por sus
  hijos (no por `value`): cada marcador es un `<Text>` con fondo de color
  y su nombre entre `«»` (`MarkerSpan`, `src/components/TemplateMarkers.tsx`).
  `src/lib/templateMarkerText.ts` pasa de `{{clave}}` a `«Nombre»` y de
  vuelta: al escribir, cada `«Nombre»` que coincide exactamente vuelve a
  ser `{{clave}}`; si se edita por dentro queda como texto y se avisa como
  desconocido. Un `TextInput` no deja dar bordes ni relleno a un tramo,
  así que en el editor el recuadro es solo fondo y color; en los botones y
  en la tabla del Excel sí es un recuadro (`MarkerBox`).
  "Descargar" de Desktop es "Compartir" aquí: Mobile no tiene diálogo de
  guardar, usa la hoja de compartir (`shareBinaryFile`).

## Pruebas

Primeras pruebas automáticas del repo: Jest (`npm test`) en Node con
`babel-preset-expo`, solo para lógica pura. No usa el preset `jest-expo`:
con SDK 57 `expo-modules-core` queda dentro de `expo/node_modules` y su
setup no lo encuentra.
