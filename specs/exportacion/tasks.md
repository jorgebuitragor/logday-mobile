# Exportación — Tareas

Estado: Notes implementado, pendiente de confirmación en vivo.

## Notes (agregado 2026-08-29)

- [x] Instalados `expo-file-system`, `expo-sharing`, `expo-print`
      (`expo-sharing` se autoregistró como config plugin en
      `app.json`).
- [x] Reinstalado `markdown-it` (+ `@types/markdown-it`) como
      dependencia directa — ya no solo transitiva vía
      `react-native-markdown-display`, ahora también usada
      directamente para generar el HTML del PDF.
- [x] `src/lib/exportFile.ts` (nuevo): `sanitizeFilename`,
      `shareTextFile`, `sharePdfFile` — mecanismo genérico, pensado
      para reusarse en Dailys/Overtime.
- [x] `src/lib/noteExport.ts` (nuevo): `exportNote(title, content, format)`,
      `buildMarkdownDoc`/`buildPlainDoc`/`buildPdfHtml` internos.
- [x] `src/components/NoteActionsSheet.tsx`: submenú de formato
      (Markdown/Texto plano/PDF, con subtítulo de extensión — mismo
      texto que `ExportModal` de desktop) que llama `onExport(format)`.
- [x] `app/note/[id].tsx`: `handleExport` conecta el submenú con
      `exportNote`.
- [x] `npx tsc --noEmit` sin errores.
- [x] Dev server reiniciado con caché limpia (`expo start -c`,
      paquetes nativos nuevos) y bundle verificado con una petición
      directa a Metro (HTTP 200, sin errores de resolución) antes de
      pedir prueba en vivo.
- [ ] Verificar en vivo: exportar una nota con título y otra sin
      título en los 3 formatos; confirmar que la hoja de compartir de
      Android aparece y que el archivo generado (nombre, contenido,
      formato visual del PDF) es correcto en cada caso.

## Dailys — pendiente

- [ ] Función de armado de contenido de un mes (`daily_entries` del
      mes, mismo formato que `dailyMonthExport.ts` de desktop:
      encabezado por fecha + separador `---` entre días).
- [ ] UI que dispare el export — el listado de Dailys
      (`app/(tabs)/dailys.tsx`) no tiene hoy ningún menú de "más
      acciones" por mes; desktop lo activa desde un menú contextual
      sobre el encabezado del mes.
- [ ] Reusar `src/lib/exportFile.ts` para MD/TXT/PDF.

## Overtime — pendiente

- [ ] Evaluar librería de escritura de `.xlsx` en JS puro (candidata:
      `exceljs`) — desktop usa `xlsx-js-style`, no directamente
      portable a React Native.
- [ ] Decidir alcance de fidelidad visual (bordes/estilos/fórmulas
      como desktop, o una hoja de datos simple).
- [ ] UI que dispare el export (mismo hueco que Dailys: no hay menú de
      "más acciones" por mes todavía en `app/(tabs)/overtime.tsx`).
