# Pantalla de Notes — Tareas

Estado: implementado y verificado en vivo (CRUD base); paridad
pinned/folder/tags verificada en vivo; editor simplificado + WYSIWYG
agregado 2026-08-29, pendiente de verificación en vivo (ver abajo,
es el cambio de mayor riesgo hecho en esta pantalla).

- [x] `src/db/notes.ts` (`listNotes`, `getNote`, `createNote`,
      `updateNote`, `softDeleteNote`).
- [x] `app/(tabs)/notes.tsx` — lista real con preview de contenido.
- [x] `app/note/new.tsx` / `app/note/[id].tsx`.
- [x] Registrar rutas `note/new` y `note/[id]` en `app/_layout.tsx`.
- [x] `npx tsc --noEmit` sin errores.
- [x] Verificar en vivo: crear, editar y eliminar una nota desde el
      dispositivo Android del usuario. Confirmado 2026-08-29.

## Paridad pinned/folder/tags (agregado 2026-08-29)

- [x] `src/db/notes.ts`: `setNotePinned`, `NoteInput.folder`/`.tags`,
      `createNote`/`updateNote` persisten `folder`/`tags`,
      `listNotes()` ordena `pinned DESC, updated DESC`.
- [x] `app/(tabs)/notes.tsx`: fila muestra indicador de pin (ícono,
      no interactivo), `folder` y `tags`.
- [x] i18n: nuevas claves en `noteForm`/`noteList` de `es.json`/`en.json`
      (`folder`, `folderPlaceholder`, `tags`, `tagPlaceholder`,
      `addTag`, `removeTag`, `pin`, `unpin`, `pinnedLabel`).
- [x] `npx tsc --noEmit` sin errores.
- [x] Verificar en vivo: anclar/desanclar una nota, asignarle carpeta y
      tags, y confirmar que la fila y el orden de la lista reflejan lo
      esperado. Confirmado 2026-08-29.

## Editor simplificado + WYSIWYG (agregado 2026-08-29)

A pedido del usuario ("el editor de notas más simple... solo título y
texto" + "es posible" un editor de negrita/código/cabeceras). Ver
design.md ("Editor simplificado", "Editor de texto enriquecido") para
el razonamiento completo.

- [x] Instalados `@10play/tentap-editor`, `react-native-webview`,
      `markdown-it`, `turndown` (+ `@types/markdown-it`,
      `@types/turndown`).
- [x] `src/lib/noteMarkdown.ts` (nuevo): `markdownToHtml`/
      `htmlToMarkdown`, conversión en el borde de guardado/carga —
      evita necesitar una bridge extension custom del editor.
- [x] `app/note/new.tsx` reescrito: crea la nota vacía de inmediato y
      navega a `/note/<id>` (`router.replace`) — ya no muestra ningún
      formulario.
- [x] `app/note/[id].tsx` reescrito por completo: título (`TextInput`
      multilínea) + `RichText`/`Toolbar` de tentap-editor como cuerpo
      principal; barra de herramientas con destacar/carpeta/tags/
      eliminar; autosave debounced (600ms, título+contenido) +
      autosave inmediato (carpeta/tags/destacado); modales propios
      para carpeta y tags (reemplazan los campos que tenía `NoteForm`).
- [x] `src/components/NoteForm.tsx` eliminado (sin uso restante).
- [x] i18n: `noteForm.content`/`contentPlaceholder`/`createSubmit`/
      `editSubmit`/`newTitle` retirados (ya no aplican); agregadas
      `folderModalTitle`, `folderSave`, `tagsModalTitle`, `tagsDone`,
      `folderButton`, `tagsButton`; `contentPlaceholder` y `editTitle`
      redactados de nuevo (ya no mencionan "markdown" ni "formulario").
      Paridad de claves es/en verificada (154 = 154).
- [x] `npx tsc --noEmit` sin errores.
- [x] Dev server reiniciado con caché limpia (`expo start -c`,
      obligatorio: `react-native-webview` es un módulo nativo nuevo).
- [ ] **Verificar en vivo — crítico, no cosmético** (ver
      design.md, "Explícitamente pendiente"): abrir una nota y
      confirmar que el editor WYSIWYG carga (`isReady` se cumple en
      tiempo razonable) y que el teclado aparece al tocar el título o
      el contenido — estos son exactamente los dos issues abiertos y
      sin resolver en GitHub contra `tentap-editor` en Android. Probar
      además: escribir con negrita/cursiva/código/cabecera desde la
      toolbar, cerrar y reabrir la nota y confirmar que el formato se
      conserva (ida y vuelta markdown → HTML → markdown vía
      `noteMarkdown.ts`); editar carpeta y tags desde los modales
      nuevos; destacar/desdestacar desde la barra; eliminar una nota.
