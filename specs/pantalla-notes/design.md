# Pantalla de Notes — Design

Estado: implementado — ver `src/db/notes.ts`, `app/(tabs)/notes.tsx`,
`app/note/new.tsx`, `app/note/[id].tsx`, `src/components/NoteForm.tsx`.

Mismo patrón que `pantalla-tasks/design.md` — no se repite lo ya
establecido ahí (rutas fuera de `(tabs)`, `presentation: 'modal'`,
`useFocusEffect` para refrescar la lista). Diferencias puntuales:

- `listNotes()` ordena por `updated DESC` (fecha de negocio), no
  `created` como `listTasks()` — ver "Listado" en `requirements.md`.
- `NoteForm` solo tiene título + contenido (más simple que `TaskForm`,
  que además tiene estado/vencimiento) — no hay selector de estado en
  una nota.
- La fila de lista muestra una vista previa del contenido (primeros
  ~80 caracteres, sin saltos de línea) además del título — a
  diferencia de Task, donde el status ya es suficiente contexto en la
  fila.

A diferencia de `pantalla-tasks/` (construida antes de `temas/`/`i18n/`
y migrada después), esta pantalla se construyó **ya usando** los
tokens de tema y `t('...')` desde el primer commit — no hay paso de
retrofit acá.

## Explícitamente pendiente

- `folder`/`tags`/`pinned` en el formulario.
- Confirmación antes de eliminar (mismo criterio que Task: se agrega
  si en el uso real resulta ser un problema).
