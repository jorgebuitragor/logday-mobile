# Pantalla de Notes — Tareas

Estado: implementado y verificado en vivo (CRUD base); paridad
pinned/folder/tags agregada 2026-08-29, pendiente de verificación en
vivo.

- [x] `src/db/notes.ts` (`listNotes`, `getNote`, `createNote`,
      `updateNote`, `softDeleteNote`).
- [x] `src/components/NoteForm.tsx` (título + contenido), con tema/i18n
      desde el inicio.
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
- [x] `src/components/NoteForm.tsx`: campos `folder` (texto libre) y
      `tags` (chips), mismo patrón que `TaskForm.tsx`.
- [x] `app/note/[id].tsx`: botón de anclar/desanclar (`setNotePinned`),
      pasa `folder`/`tags` a `initialValue`.
- [x] `app/(tabs)/notes.tsx`: fila muestra indicador de pin (ícono,
      no interactivo), `folder` y `tags`.
- [x] i18n: nuevas claves en `noteForm`/`noteList` de `es.json`/`en.json`
      (`folder`, `folderPlaceholder`, `tags`, `tagPlaceholder`,
      `addTag`, `removeTag`, `pin`, `unpin`, `pinnedLabel`).
- [x] `npx tsc --noEmit` sin errores.
- [ ] Verificar en vivo: anclar/desanclar una nota, asignarle carpeta y
      tags, y confirmar que la fila y el orden de la lista reflejan lo
      esperado.
