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

## Compartir (agregado 2026-08-29)

- [x] `src/lib/exportFile.ts`: `shareText(content)` — `Share.share`
      nativo de RN, sin escribir archivo.
- [x] `NoteActionsSheet.tsx`: nueva fila "Compartir" (ícono `Share2`,
      reasignado desde "Exportar", que ahora usa `Download`).
- [x] `app/note/[id].tsx` y `app/(tabs)/notes.tsx`: `handleShare`/
      `handleShareNote` conectados, mismo `buildMarkdownDoc` que
      Copiar.
- [x] i18n: `noteActions.share` en es/en. Paridad verificada.
- [x] `npx tsc --noEmit` sin errores.
- [ ] Verificar en vivo: "Compartir" abre la hoja de compartir nativa
      de Android con el texto correcto (con y sin título).

## Ampliación desde la lista: Editar/Destacar/Carpeta/Tags/Eliminar (agregado 2026-08-30)

- [x] `NoteActionsSheet.tsx`: 9 props nuevas, todas opcionales
      (`pinned`/`folder`/`tags`/`onEdit`/`onTogglePin`/`onSaveFolder`/
      `onAddTag`/`onRemoveTag`/`onDelete`); 2 modos nuevos
      (`'folder'`/`'tags'`); fila "Eliminar" con estilo destructivo
      (rojo, `#dc2626`) tras una línea divisoria.
- [x] `src/lib/noteTags.ts` (nuevo): `normalizeTag` extraído de
      `app/note/[id].tsx` (que ahora lo importa en vez de definirlo
      local).
- [x] `app/(tabs)/notes.tsx`: `handleTogglePinNote`/
      `handleSaveFolderNote`/`handleAddTagNote`/`handleRemoveTagNote`
      (llaman `setNotePinned`/`updateNote` directo); `onEdit` navega
      con `router.push`; `onDelete` reusa `confirmDelete.request`
      (mismo flujo que el swipe). Único `<NoteActionsSheet>` del
      archivo (compartido entre Lista y Cuadrícula) ahora pasa los 9
      props nuevos.
- [x] `app/note/[id].tsx`: sin cambios en su uso de
      `<NoteActionsSheet>` (no pasa los props nuevos) — verificado que
      esas filas no aparecen ahí, solo desde la lista.
- [x] i18n: sin claves nuevas — reusa `common.edit`,
      `noteForm.pin`/`unpin`/`folderButton`/`tagsButton`/`delete`/
      `folderModalTitle`/`tagsModalTitle` ya existentes. Paridad sin
      cambios (202 = 202).
- [x] `./node_modules/.bin/tsc --noEmit` sin errores.
- [x] Bundle de Metro pedido directo, sin errores de resolución.
- [ ] Verificar en vivo: las 5 acciones nuevas desde la lista (Editar,
      Destacar/Quitar, Carpeta, Tags, Eliminar); que no aparecen
      dentro del editor (solo desde la lista); que el teclado no tapa
      el input de carpeta/tag nuevo (riesgo conocido, ver design.md).

## Mantener presionado para abrir el menú (agregado 2026-08-30)

- [x] `app/(tabs)/notes.tsx`: `onLongPress={() => setActionsNote(item)}`
      en la fila de Lista; `NoteCard` recibe `onLongPress={onMore}` en
      su `Pressable` (Cuadrícula).
- [x] `./node_modules/.bin/tsc --noEmit` sin errores.
- [x] Bundle de Metro pedido directo, HTTP 200.
- [ ] Verificar en vivo: mantener presionado una fila (Lista) y una
      tarjeta (Cuadrícula) abre la misma hoja que el botón "⋮"; no
      interfiere con el swipe-para-eliminar ni con el tap normal
      (que sigue navegando a la nota).
