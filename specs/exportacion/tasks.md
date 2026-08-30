# Exportación — Tareas

Estado: Notes, Dailys y Overtime implementados, pendiente de
confirmación en vivo.

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

## Compartir — Notes y Dailys (agregado 2026-08-29)

- [x] `src/lib/exportFile.ts`: `shareText(content)` (`Share.share`
      nativo de RN).
- [x] `NoteActionsSheet.tsx`: fila "Compartir" nueva; ícono `Share2`
      reasignado desde "Exportar" (que ahora usa `Download`).
- [x] `app/note/[id].tsx`/`app/(tabs)/notes.tsx`: `handleShare`/
      `handleShareNote` conectados.
- [x] `DailyMonthActionsSheet.tsx`: fila "Compartir" (comparte el mes
      en formato texto plano, `buildDailyMonthDoc(..., 'txt')`).
- [x] i18n: `noteActions.share`, `dailyActions.share`. Paridad
      verificada (189 = 189).
- [ ] Verificar en vivo en ambas pantallas.

## Dailys (agregado 2026-08-29)

- [x] `src/lib/dailyMonthExport.ts`: `buildDailyMonthDoc` (MD/TXT,
      mismo formato que desktop) y `exportDailyMonth` (PDF vía
      `expo-print`, renderizando la lista de actividades con
      `markdown-it` en vez de texto crudo).
- [x] `app/(tabs)/dailys.tsx`: convertido de `FlatList` plana a
      `SectionList` agrupada por mes (mismo patrón que
      `overtime.tsx`); botón "⋮" en cada encabezado de mes.
- [x] `src/components/DailyMonthActionsSheet.tsx` (nuevo): Compartir +
      Exportar (submenú MD/TXT/PDF) — mismo patrón que
      `NoteActionsSheet`, sin "Duplicar".
- [x] i18n: sección `dailyActions` en es/en.
- [x] `common.months` (movido desde `overtimeList.months`, ahora
      compartido entre Dailys y Overtime) — `overtime.tsx` actualizado
      para leer de ahí.
- [x] `./node_modules/.bin/tsc --noEmit` sin errores.
- [ ] Verificar en vivo: exportar un mes con datos en los 3 formatos;
      confirmar contenido, orden cronológico y que el PDF muestra
      viñetas reales.

## Overtime (agregado 2026-08-29)

- [x] Instalado `xlsx-js-style@^1.2.0` (misma librería que desktop) —
      se evaluó `exceljs` como alternativa pero se prefirió portar la
      lógica ya existente. Verificado que Metro la resuelve sin error
      (bundle pedido directo, sin errores de resolución; `xlsx-js-style`/
      `generateOvertimeXlsx` aparecen en el bundle) y que `npm audit`
      no reporta vulnerabilidades nuevas por instalarla.
- [x] `src/lib/overtimeExcel.ts`: puerto directo de `overtimeExcel.ts`
      de desktop (mismos estilos/bordes/fórmulas `SUM`).
- [x] `src/lib/overtimeExport.ts` (nuevo): ordena entradas
      cronológicamente, arma el nombre de archivo (mismo criterio que
      desktop: `Reporte Extras {colaborador} - {mesLabel}.xlsx`),
      llama `shareBinaryFile`.
- [x] `src/lib/exportFile.ts`: `shareBinaryFile(filename, bytes, mimeType)`
      — mismo patrón que `shareTextFile` pero con `Uint8Array` (el
      `.write()` de `expo-file-system` v57 acepta bytes directo, sin
      pasar por base64 como sí necesita desktop).
- [x] `src/db/overtime.ts`: `getOvertimeMonthMeta(yearMonth)` — lee la
      tabla `overtime_month_meta` (ya existía en el schema, sync desde
      desktop, sin getter todavía).
- [x] `app/(tabs)/overtime.tsx`: botón "⋮" en el encabezado de mes ya
      existente (junto al total de horas).
- [x] `src/components/OvertimeMonthActionsSheet.tsx` (nuevo): un solo
      row "Exportar (.xlsx)" — sin submenú de formato (uno solo) ni
      "Compartir" (ver requirements.md, por qué).
- [x] i18n: sección `overtimeActions` en es/en.
- [x] `./node_modules/.bin/tsc --noEmit` sin errores.
- [ ] Verificar en vivo: exportar un mes con datos; abrir el `.xlsx`
      resultante en Excel/Sheets y confirmar que los totales
      (fórmulas `SUM`) calculan bien y el estilo visual coincide con
      el de desktop.
- [x] UI propia para editar colaborador/cédula en mobile — implementada
      después en [`pantalla-overtime/`](../pantalla-overtime/requirements.md)
      (`OvertimeMonthActionsSheet` + `upsertOvertimeMonthMeta`), ya no
      depende de que llegue por sync desde desktop.
