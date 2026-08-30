# Menú contextual de Notes — Tareas

Estado: implementado, pendiente de confirmación en vivo.

- [x] `src/components/NoteActionsSheet.tsx` (nuevo): hoja de acciones
      con modos `'actions'`/`'export'`, reseteo de modo al abrir.
- [x] `app/note/[id].tsx`: botón "⋮" (`MoreHorizontal`) en la barra
      superior, junto a destacar/carpeta/tags/vista previa;
      `handleCopyToClipboard`, `handleDuplicate`, `handleExport`
      (delega a `src/lib/noteExport.ts`).
- [x] `src/lib/noteExport.ts`: `buildMarkdownDoc` exportada (antes
      privada) para que Copiar y el export a Markdown compartan el
      mismo formato.
- [x] i18n: nueva sección `noteActions` en `es.json`/`en.json`
      (`menuLabel`, `copy`, `duplicate`, `export`, `formatMd`/
      `formatMdHint`, `formatTxt`/`formatTxtHint`, `formatPdf`/
      `formatPdfHint`). Paridad de claves es/en verificada (175 = 175).
- [x] `npx tsc --noEmit` sin errores.
- [ ] Verificar en vivo: el botón "⋮" abre la hoja; Copiar deja el
      texto correcto en el portapapeles (con y sin título); Duplicar
      crea la copia con el sufijo correcto y navega a ella; Exportar
      abre el submenú de formatos (ver `exportacion/tasks.md` para la
      verificación de cada formato en sí).
