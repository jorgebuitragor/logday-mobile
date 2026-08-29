# Pantalla de Notes — Design

Estado: implementado — ver `src/db/notes.ts`, `app/(tabs)/notes.tsx`,
`app/note/new.tsx`, `app/note/[id].tsx`, `src/components/NoteForm.tsx`.

Mismo patrón que `pantalla-tasks/design.md` — no se repite lo ya
establecido ahí (rutas fuera de `(tabs)`, `presentation: 'modal'`,
`useFocusEffect` para refrescar la lista). Diferencias puntuales:

- `listNotes()` ordena por `pinned DESC, updated DESC` (ver
  "Pinned" más abajo) — no solo `created` como `listTasks()`.
- `NoteForm` tiene título + `folder` (texto libre) + `tags` (chips) +
  contenido — sin selector de estado, a diferencia de `TaskForm`.
- La fila de lista muestra, además de título y preview: indicador de
  pin, `folder` (si tiene) y `tags` (si tiene) — ver "Fila de lista"
  más abajo.

A diferencia de `pantalla-tasks/` (construida antes de `temas/`/`i18n/`
y migrada después), esta pantalla se construyó **ya usando** los
tokens de tema y `t('...')` desde el primer commit — no hay paso de
retrofit acá.

## Pinned (agregado 2026-08-29)

- `src/db/notes.ts` agrega `setNotePinned(id, pinned)` — hace lo mismo
  que `toggleNotePin` en el store de desktop: pisa `pinned`, `updated`
  y `updated_at` a la vez (desktop llega a ese mismo efecto indirecto
  porque `toggleNotePin` reusa `updateNote`, que siempre refresca
  `updated`).
- `listNotes()` ordena `ORDER BY pinned DESC, updated DESC` — resuelve
  en SQL lo que desktop resuelve con un `.sort()` en memoria en
  `NoteList.tsx` (mismo resultado: notas ancladas arriba, y dentro de
  cada grupo la más reciente primero).
- El toggle de pin vive en `app/note/[id].tsx` (un botón arriba del
  formulario, con label "Destacar"/"Quitar destacado" — strings
  copiados literal de `notes.pinTitle`/`notes.unpinTitle` en el i18n
  de desktop), no en la fila de la lista ni detrás de un swipe. Se
  decidió así porque `acciones-lista/requirements.md` ya excluyó
  explícitamente "cambio rápido de estado sin abrir el formulario"
  como fuera de alcance (lo dice a propósito de Task, pero aplica
  igual acá: es la misma categoría de decisión, no haber dos criterios
  distintos para casos equivalentes). La fila de la lista sí **muestra**
  el estado con un ícono `Pin` relleno en ámbar (`#f59e0b`, mismo
  color fijo — no token de tema — que usa desktop para el indicador
  `text-amber-400`; incluye `accessibilityLabel`).

## Folder y tags (agregado 2026-08-29)

- `NoteForm` gana dos campos nuevos, en el mismo estilo que ya existe
  en `TaskForm` (`project`/`tags`, ver `src/components/TaskForm.tsx`):
  `folder` como `TextInput` de una línea, y `tags` como chips
  removibles + input para agregar. Normalización de tag nuevo idéntica
  a `handleAddTag` de `NoteList.tsx` en desktop: minúsculas, espacios
  → guiones, sin duplicados.
- `src/db/notes.ts`: `NoteInput` gana `folder: string` y
  `tags: string[]`; `createNote`/`updateNote` los persisten en las
  columnas SQLite que ya existían (`folder`, `tags` como JSON) pero
  antes se hardcodeaban a `''`/`'[]'`.
- La fila de lista (`app/(tabs)/notes.tsx`) muestra `folder` como texto
  chico y `tags` como chips con `theme.accentSoft`/`theme.accentInk` —
  mismos tokens que ya usa `TaskForm` para sus chips de tags, para no
  inventar una paleta nueva.
- No hay picker de carpetas existentes ni filtro por tag desde el
  listado — ver "Fuera de este spec" en `requirements.md`.

## Explícitamente pendiente

- Picker/autocompletado de `folder` a partir de carpetas existentes.
- Filtro por `tag`/`folder` desde el listado.
- Menú de más acciones (renombrar, duplicar, copiar, exportar, abrir
  en el sistema) — sin equivalente táctil construido.
