# Pantalla de Notes — Requirements

Estado: implementado, incluyendo paridad funcional con desktop para
`pinned`/`folder`/`tags` (agregado 2026-08-29).

## Contexto

Segundo spec de pantalla por entidad, mismo patrón que
`pantalla-tasks/`. Reemplaza el placeholder de conteo del tab Notes
por CRUD real.

## Requisitos (EARS)

### Listado

- El tab "Notes" DEBERÁ mostrar la lista real de notas no eliminadas
  (`deleted_at IS NULL`), ordenadas por `pinned` primero y, dentro de
  cada grupo, por `updated` descendente (fecha de negocio, no
  `updated_at` de bookkeeping) — mismo criterio de ordenación que
  `NoteList.tsx` de desktop (`a.pinned !== b.pinned ? ... : ...`).
- Cada fila DEBERÁ mostrar al menos título y una vista previa corta
  del contenido.
- Cada fila DEBERÁ mostrar, cuando apliquen, un indicador de nota
  anclada (`pinned`), la `folder` de la nota y sus `tags` — mismo
  contenido informativo que la fila de `NoteList.tsx` de desktop,
  adaptado a chips táctiles en vez de texto pequeño inline.
- El sistema DEBERÁ ofrecer una acción visible para crear una nota
  nueva desde el listado.
- El sistema DEBERÁ permitir filtrar el listado por `folder` y/o por
  `tag`, con chips derivados de los valores distintos presentes en las
  notas cargadas — mismo concepto que "Filtrar por tag" del menú de
  ordenar de `NoteList.tsx` en desktop, extendido a `folder` (agregado
  2026-08-29, ver `design.md`).

### Creación y edición

- El sistema DEBERÁ permitir crear/editar una nota con: título
  (obligatorio), contenido (opcional, markdown plano), `folder`
  (opcional, texto libre) y `tags` (0 o más, editables como chips).
- El sistema DEBERÁ permitir anclar/desanclar (`pinned`) una nota
  existente desde la pantalla de edición — no desde la fila de la
  lista directamente, para no contradecir la decisión ya tomada en
  `acciones-lista/requirements.md` ("Cambio rápido de estado sin abrir
  el formulario" queda fuera de alcance); la fila solo **muestra** el
  estado `pinned` vigente, no lo cambia.
- Al guardar, el sistema DEBERÁ generar el `id` en el dispositivo
  (UUID), y setear `created`/`updated`/`updated_at` al momento de
  creación; en edición, actualizar `updated`/`updated_at`. Anclar o
  desanclar también actualiza `updated`/`updated_at` — mismo efecto
  colateral que `toggleNotePin` en el store de desktop, que reusa
  `updateNote` (siempre pisa `updated`).
- El sistema DEBERÁ permitir marcar una nota como eliminada
  (soft-delete), no borrarla físicamente.

## Fuera de este spec

- Editor de texto enriquecido — contenido es texto plano por ahora
  (mismo criterio que `esquema-datos/design.md`: sin CRDT todavía, sin
  cliente de sync).
- Navegador/selector de carpetas existentes ("Mover a…", picker con
  autocompletado, crear/renombrar carpetas) — desktop lo resuelve con
  un submenú de carpetas ya creadas (`NoteList.tsx`/`NoteEditor.tsx`
  `moveTo`); mobile solo expone `folder` como campo de texto libre en
  el formulario. Se difiere porque construir un picker real requeriría
  una fuente de "carpetas existentes" (consulta `DISTINCT folder`) y
  una superficie de navegación que hoy no existe en ninguna pantalla
  de mobile — no es necesario para que `folder` ya aporte valor
  (agrupar/anotar notas por texto), y evita inventar una UI de
  navegación por carpetas fuera del patrón de listado plano que usan
  las 4 entidades.
- Renombrar, duplicar, copiar, exportar o "abrir en el sistema" una
  nota — acciones del menú contextual de desktop sin equivalente
  táctil construido todavía; no hay superficie de "más acciones" en
  mobile más allá de swipe (editar/eliminar) y el toggle de pin.
- Cualquier lógica de sync.
