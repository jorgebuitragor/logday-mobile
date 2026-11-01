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
  `TemplatesConfig`) y `buildDailyMessage`. Es lo único adaptado: la de
  Logday delega en `buildDailyCopyText` de `dailyCopyText.ts`, que recibe
  fechas `YYYY-MM-DD`, así que las `Date` del contexto se pasan con
  `localISODate`.

Los motores corren en Hermes: el bundle de `expo export` los compila a
bytecode sin errores (usan `matchAll` y `\b`, sin lookbehind).

### Diferencia con Desktop: la plantilla de Logday escrita a mano

El mensaje de siempre de Mobile es una versión reducida del de Desktop:
fechas `YYYY-MM-DD` en vez de "Viernes 30 de Octubre", el día anterior es
el de calendario (no el laborable) y siempre dice "El día de hoy".
`LOGDAY_DAILY_TEMPLATE` reproduce el de Desktop, así que una propia que
arranca con "Empezar con la de Logday" sale con los nombres de día y mes,
no idéntica a la de Logday de Mobile. Por eso la prueba
"da lo mismo que buildDailyCopyText" compara contra una copia del
`buildDailyCopyText` de Desktop dentro del test.

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
  "Descargar" de Desktop es "Compartir" aquí: Mobile no tiene diálogo de
  guardar, usa la hoja de compartir (`shareBinaryFile`).

## Pruebas

Primeras pruebas automáticas del repo: Jest (`npm test`) en Node con
`babel-preset-expo`, solo para lógica pura. No usa el preset `jest-expo`:
con SDK 57 `expo-modules-core` queda dentro de `expo/node_modules` y su
setup no lo encuentra.
