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

## Desde la lista (agregado 2026-08-29)

- [x] `app/(tabs)/notes.tsx`: botón "⋮" en cada fila (dentro de
      `titleRow`, empujado al borde derecho); estado `actionsNote`;
      `handleCopyNote`/`handleDuplicateNote`/`handleExportNote`
      (mismas 3 acciones, operando sobre la `Note` de la fila en vez
      de refs del editor); `NoteActionsSheet` reusado sin cambios.
      `title` pasa de `flexShrink:1` a `flex:1` para empujar pin+"⋮"
      al borde derecho.
- [x] `npx tsc --noEmit` sin errores. Sin i18n nuevo (reusa
      `noteActions.*`, ya existente).
- [ ] Verificar en vivo: el botón "⋮" de una fila no dispara también
      la navegación de la fila (tocar en cualquier otro punto de la
      fila sí navega); duplicar desde la lista navega a la copia con
      `router.push` (el botón atrás del sistema debe volver al
      listado, no a la nota original); las 3 acciones funcionan igual
      que desde dentro del editor.
