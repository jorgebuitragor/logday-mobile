# Exportación — Design

Estado: Notes, Dailys y Overtime implementados — ver
`src/lib/exportFile.ts`, `src/lib/noteExport.ts`,
`src/lib/dailyMonthExport.ts`, `src/lib/overtimeExcel.ts`,
`src/lib/overtimeExport.ts`, `src/components/NoteActionsSheet.tsx`,
`src/components/DailyMonthActionsSheet.tsx`,
`src/components/OvertimeMonthActionsSheet.tsx`.

## Mecanismo compartido: `src/lib/exportFile.ts`

Reusado tal cual por Notes, Dailys y Overtime:

- `sanitizeFilename(name)` — quita caracteres inválidos de nombre de
  archivo (`\/:*?"<>|`), colapsa espacios, recorta a 80 caracteres,
  cae a `"sin-titulo"` si queda vacío.
- `shareTextFile(filename, content, mimeType)` — escribe un archivo de
  texto en el directorio de caché (`Paths.cache`, API nueva de
  `expo-file-system` v57 — `File`/`Directory`/`Paths`, no la API
  legada `FileSystem.writeAsStringAsync`/`cacheDirectory` de versiones
  anteriores del SDK) y abre la hoja de compartir
  (`Sharing.shareAsync`).
- `sharePdfFile(uri, dialogTitle)` — comparte un PDF ya generado (por
  `expo-print`, que entrega su propio `uri` en caché — no hace falta
  escribirlo a mano).
- `shareBinaryFile(filename, bytes: Uint8Array, mimeType)` (agregado
  2026-08-29, para Overtime) — igual que `shareTextFile` pero escribe
  bytes crudos: `File.write()` de `expo-file-system` v57 acepta
  `string | Uint8Array` directo, así que el `.xlsx` (formato binario
  ZIP) no necesita pasar por base64 en ningún punto.
- `shareText(content)` (agregado 2026-08-29, para "Compartir") — usa
  el `Share` nativo de React Native, no `expo-sharing`: abre la hoja
  de compartir directo con texto como mensaje, sin escribir ningún
  archivo. Distinto mecanismo a propósito — `expo-sharing` solo sabe
  compartir archivos ya en disco.

## Por qué `expo-print` para PDF, no un renderer manual como desktop

Desktop dibuja el PDF bloque por bloque a mano con **jsPDF**
(`exportNote.ts`, `buildPdf()` — parsea el HTML/markdown de la nota en
bloques tipados: cabeceras, listas, tablas, código, citas, imágenes,
diagramas Mermaid — y dibuja cada uno con primitivas de jsPDF, ~270
líneas solo para eso). Esa complejidad existe porque Tauri/WebView de
escritorio no tiene una forma nativa sencilla de "imprimir HTML a
PDF" disponible para la app.

`expo-print` sí la tiene: `Print.printToFileAsync({ html })` renderiza
un string HTML a PDF usando el motor de impresión nativo del SO
(WebView interno en Android, `UIPrintPageRenderer0` o similar en iOS)
y devuelve un `uri` al archivo ya generado. Por eso el PDF de Notes en
mobile se arma en dos pasos simples en vez de un renderer manual:

1. `markdown-it` convierte el markdown de la nota a HTML (`md.render(content)`
   en `noteExport.ts` — reinstalado como dependencia directa; se había
   quitado tras revertir el editor WYSIWYG, pero ahora lo usa
   directamente el export, no solo transitivamente vía
   `react-native-markdown-display`).
2. Ese HTML se envuelve en una plantilla mínima con estilos inline
   (`buildPdfHtml` — tipografía, bloques de código con fondo gris,
   citas con borde izquierdo) y se pasa a `Print.printToFileAsync`.

Sin parseo de bloques a mano, sin dibujar primitivas — el motor de
impresión nativo hace el trabajo de layout/paginación que desktop hace
manualmente con jsPDF. Contrapartida: no hay soporte para Mermaid ni
tablas con el mismo nivel de control visual que desktop (fuera de
alcance, ver requirements.md).

## Formato de archivo por tipo (Notes)

| Formato | Contenido | MIME |
|---|---|---|
| `.md` | `buildMarkdownDoc(title, content)` — `"# título\n\ncontenido"` o solo contenido | `text/markdown` |
| `.txt` | `buildPlainDoc(title, content)` — `"título\n\ncontenido"` sin `#` | `text/plain` |
| `.pdf` | `buildPdfHtml(title, content)` → `Print.printToFileAsync` | `application/pdf` |

## Auditoría de dependencias

`markdown-it` ya se había evaluado (issue conocido: `linkify-it`
arrastra una vulnerabilidad "high" de ReDoS sin fix, ver
`pantalla-notes/design.md`, "Vista previa") — riesgo aceptado, mismo
razonamiento (contenido siempre local, sin sync). `expo-file-system`,
`expo-sharing`, `expo-print` son paquetes oficiales de Expo, sin
vulnerabilidades nuevas reportadas al instalarlos.

## Dailys — armado de contenido de un mes

`src/lib/dailyMonthExport.ts` — `buildDailyMonthDoc`/`exportDailyMonth`
mismo formato exacto que `dailyMonthExport.ts` de desktop para
Markdown/texto plano (encabezado del mes, `## fecha` o `fecha` con
subrayado por día, separados por `---`). El caller
(`app/(tabs)/dailys.tsx`) arma `entries: [string, string][]` filtrando
el estado ya cargado (`entries.filter(e => e.date.startsWith(yearMonth))`)
y ordenando ascendente — no hace falta una query SQL nueva, el
listado ya trae todo local.

Para el PDF, a diferencia del jsPDF de desktop (que imprime cada línea
como texto literal, "- item" con el guion visible), acá se reutiliza
`markdown-it` igual que en `noteExport.ts`: el contenido de un daily
("- item1\n- item2") ya es markdown válido, así que
`md.render(content)` lo convierte en una lista `<ul><li>` real con
viñetas — mejor resultado visual que el original, sin trabajo extra.

## Overtime — `src/lib/overtimeExcel.ts` y la elección de librería

Se evaluó `exceljs` (mencionada como candidata en la primera versión
de este spec) pero se optó por **portar `xlsx-js-style` tal cual**
(misma librería que desktop, mismo archivo de ~360 líneas con el
armado celda-por-celda: título, cabecera colaborador/cédula, tabla de
17+ filas con bordes, fórmulas `SUM` reales en las columnas de
totales, leyenda) en vez de reescribir la lógica de estilos con otra
API. Razón: portar > reescribir cuando la lógica ya existe, probada, y
solo cambia el punto de salida de los bytes.

Riesgo evaluado antes de portar: `xlsx-js-style` trae dependencias
(`cfb`, `ssf`, `codepage`, etc.) pensadas para Node/browser, no RN. Se
verificó que Metro las resuelve sin error (el `package.json` de la
librería declara un campo `"browser"` que anula `fs`/`buffer`/
`stream`/`crypto`/`process` — Metro respeta ese campo, y el modo de
escritura usado acá, `XLSX.write(wb, { type: 'array' })`, nunca llega
a esas rutas) pidiendo el bundle de Metro directo y confirmando que
`xlsx-js-style`/`overtimeExcel`/`generateOvertimeXlsx` aparecen
resueltos en el bundle sin errores de resolución — mismo patrón de
verificación que se usó para el bug de `punycode` con `markdown-it`.
`npm audit` no reportó vulnerabilidades nuevas al instalarla.

`File.write()` de `expo-file-system` v57 acepta `Uint8Array`
directamente (`write(content: string | Uint8Array)`), así que
`generateOvertimeXlsx` (que devuelve `Uint8Array`, igual que en
desktop) se pasa tal cual a `shareBinaryFile` sin conversión a
base64 — desktop sí necesita ese paso (`btoa(String.fromCharCode(...bytes))`)
porque su capa de escritura (`fs.writeBinary` de Tauri) solo acepta
string en ese punto; mobile no tiene esa restricción.

`src/db/overtime.ts`: `getOvertimeMonthMeta(yearMonth)` — de solo
lectura, sobre una tabla (`overtime_month_meta`) que ya existía en el
schema y se sincroniza desde desktop, pero mobile todavía no tiene UI
propia para editarla (colaborador/cédula se configuran desde desktop).
El export usa el mismo fallback que desktop si no hay meta:
`colaborador || 'Colaborador'`.

## Explícitamente pendiente

- Verificación en vivo de los 3 formatos de Notes en el dispositivo
  real del usuario (Markdown/TXT son bajo riesgo — escritura de
  archivo simple; PDF es la pieza nueva, `expo-print` no se había
  usado antes en este proyecto).
- Verificación en vivo del export de Dailys (3 formatos) y de
  Overtime (`.xlsx` — primer uso de `xlsx-js-style` en mobile; abrir
  el archivo en Excel/Sheets para confirmar que las fórmulas y
  estilos se ven igual que el de desktop).
- Verificación en vivo de "Compartir" en Notes y Dailys.
- UI propia en mobile para editar colaborador/cédula de Overtime — no
  existe todavía, fuera de alcance de este checkpoint (ver
  `db/overtime.ts`, `getOvertimeMonthMeta`).
