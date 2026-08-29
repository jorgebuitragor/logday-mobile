# Pantalla de Notes — Tareas

Estado: implementado y verificado en vivo.

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
