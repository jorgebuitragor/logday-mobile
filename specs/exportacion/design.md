# Exportación — Design

Estado: Notes implementado — ver `src/lib/exportFile.ts`,
`src/lib/noteExport.ts`, `src/components/NoteActionsSheet.tsx`.

## Mecanismo compartido: `src/lib/exportFile.ts`

Pensado para reusarse en Dailys/Overtime, no solo Notes:

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

## Explícitamente pendiente

- Verificación en vivo de los 3 formatos en el dispositivo real del
  usuario (Markdown/TXT son bajo riesgo — escritura de archivo simple;
  PDF es la pieza nueva, `expo-print` no se había usado antes en este
  proyecto).
- Dailys y Overtime — ver "Fuera de este spec" en requirements.md.
