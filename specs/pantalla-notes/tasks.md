# Pantalla de Notes — Tareas

Estado: implementado y verificado en vivo (CRUD base); paridad
pinned/folder/tags verificada en vivo; editor simplificado agregado
2026-08-29 (título+contenido primario, carpeta/tags/pin secundarios);
el editor WYSIWYG se implementó, se probó en vivo y se **revirtió** el
mismo día por bugs reportados por el usuario, reemplazado por una
toolbar de markdown sobre `TextInput` — pendiente de verificación en
vivo de esta versión revertida (ver abajo).

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

## Editor simplificado (agregado 2026-08-29)

A pedido del usuario ("el editor de notas más simple... solo título y
texto"). Ver design.md ("Editor simplificado") para el razonamiento
completo.

- [x] `app/note/new.tsx` reescrito: crea la nota vacía de inmediato y
      navega a `/note/<id>` (`router.replace`) — ya no muestra ningún
      formulario.
- [x] `app/note/[id].tsx` reescrito: título (`TextInput` multilínea) +
      contenido como cuerpo principal; barra de herramientas con
      destacar/carpeta/tags/eliminar; autosave debounced (600ms,
      título+contenido) + autosave inmediato (carpeta/tags/destacado);
      modales propios para carpeta y tags (reemplazan los campos que
      tenía `NoteForm`).
- [x] `src/components/NoteForm.tsx` eliminado (sin uso restante).
- [x] i18n: `noteForm.content`/`createSubmit`/`editSubmit`/`newTitle`
      retirados (ya no aplican); agregadas `folderModalTitle`,
      `folderSave`, `tagsModalTitle`, `tagsDone`, `folderButton`,
      `tagsButton`; `editTitle` redactado de nuevo (ya no menciona
      "formulario").
- [x] `npx tsc --noEmit` sin errores.

## Editor WYSIWYG — implementado, probado en vivo, revertido (2026-08-29)

Ver design.md, "Formato de texto — historial y reversión", para el
detalle completo. Resumen: se implementó `@10play/tentap-editor`
(TipTap sobre WebView) tras advertirle al usuario el riesgo real
(issues de Android sin resolver); al probarlo en vivo el usuario
confirmó "muchos bugs" y pidió revertir a la toolbar de markdown que
se le había recomendado originalmente.

- [x] Instalado y luego desinstalado por completo: `@10play/tentap-editor`,
      `react-native-webview`, `markdown-it`, `turndown` (+ `@types/*`).
- [x] `src/lib/noteMarkdown.ts` creado y luego eliminado (ya no hace
      falta ninguna conversión markdown ⇄ HTML).
- [x] `app/note/[id].tsx` reescrito de vuelta a `TextInput` de texto
      plano.

## Toolbar de markdown (agregado 2026-08-29, reemplaza el intento WYSIWYG)

- [x] `src/components/MarkdownToolbar.tsx` (nuevo): 9 botones
      (negrita, cursiva, código, H1, H2, lista con viñetas, lista
      numerada, cita, enlace) sobre `content`/`selection` controlados
      en `app/note/[id].tsx` (`onSelectionChange` + prop `selection`).
- [x] `app/note/[id].tsx`: `content` vuelve a ser un `TextInput`
      multilínea plano; se agrega estado `selection` y
      `handleToolbarChange` (aplica el cambio de la toolbar por el
      mismo camino de autosave que tipear a mano).
- [x] i18n: agregadas `noteForm.formatBold`/`formatItalic`/`formatCode`/
      `formatH1`/`formatH2`/`formatBulletList`/`formatOrderedList`/
      `formatQuote`/`formatLink` (accessibility labels de los botones);
      `contentPlaceholder` vuelve a mencionar markdown. Paridad de
      claves es/en verificada (163 = 163).
- [x] `npx tsc --noEmit` sin errores.
- [x] Dev server reiniciado con caché limpia (`expo start -c`,
      obligatorio: se removió `react-native-webview`, un módulo
      nativo).
- [ ] Verificar en vivo: el editor carga sin los bugs reportados
      contra la versión WYSIWYG; los 9 botones de formato envuelven/
      anteponen el token correcto sobre la selección; el cursor no
      salta de forma rara después de usar un botón (ver design.md,
      riesgo señalado sobre `selection` controlada en RN); cerrar y
      reabrir una nota conserva el markdown escrito.
