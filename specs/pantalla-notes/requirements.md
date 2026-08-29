# Pantalla de Notes — Requirements

Estado: implementado, incluyendo paridad funcional con desktop para
`pinned`/`folder`/`tags` (agregado 2026-08-29) y editor de texto
enriquecido (agregado 2026-08-29, ver "Editor" abajo — corrige la
decisión anterior de dejarlo fuera de alcance).

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

### Creación y edición (reescrito 2026-08-29 — editor simplificado)

El usuario reportó que el formulario de creación/edición (título +
contenido + carpeta + tags, los 4 campos a la vez) "abrumaba" y pidió
que fuera "más simple y directo... solo título y texto" — mismo
criterio que desktop, que investigado a fondo resultó **no ser un
formulario en absoluto**: `NoteEditor.tsx` crea la nota vacía de
inmediato y abre el editor directo, con título + contenido como única
superficie principal; carpeta, tags y destacado son acciones
secundarias en una barra de herramientas, no campos de un formulario.
Se porta ese mismo modelo, no el formulario anterior:

- Al tocar "crear nota", el sistema DEBERÁ crear una nota vacía de
  inmediato (id UUID, título y contenido vacíos, `created`/`updated`/
  `updated_at` al momento de creación) y navegar directo a su editor —
  sin ningún diálogo previo pidiendo campos.
- La pantalla de editar nota DEBERÁ mostrar como superficie principal
  **solo** el título (texto libre) y el contenido (editor de texto
  enriquecido, ver "Editor" abajo) — ningún otro campo compite por
  atención en el cuerpo de la pantalla.
- `folder`, `tags` y `pinned` DEBERÁN seguir siendo editables, pero
  como acciones secundarias en una barra superior (botones que abren
  un modal puntual para carpeta/tags, y un toggle para destacar) — no
  como campos del cuerpo del formulario. Anclar/desanclar sigue sin
  estar disponible desde la fila de la lista (ver
  `acciones-lista/requirements.md`), solo desde esta barra.
- Cada cambio (título, contenido, carpeta, tags, destacado) DEBERÁ
  guardarse automáticamente — sin botón "Guardar" — actualizando
  `updated`/`updated_at`. El contenido y el título usan un debounce de
  600ms tras la última edición (mismo valor que `schedulesSave` en
  `NoteEditor.tsx` de desktop); carpeta/tags/destacado se guardan de
  inmediato al confirmarse (son ediciones discretas, no tecleo
  continuo).
- El sistema DEBERÁ permitir marcar una nota como eliminada
  (soft-delete), no borrarla físicamente.

### Editor de texto enriquecido (agregado 2026-08-29)

- El contenido de una nota DEBERÁ editarse con un editor de texto
  enriquecido real (WYSIWYG) — no un `TextInput` de texto plano con
  markdown escrito a mano — para que negrita, código, cabeceras, listas,
  etc. se apliquen con botones de una barra de formato, igual que en
  desktop (`NoteEditor.tsx`, basado en TipTap/ProseMirror).
- El dato seguirá almacenándose como markdown (`notes.content`, mismo
  esquema, mismo formato que desktop) — la conversión markdown ⇄ HTML
  ocurre en el borde de guardado/carga (`src/lib/noteMarkdown.ts`), no
  dentro del editor.
- Se usa `@10play/tentap-editor` (TipTap sobre un WebView, vía
  `react-native-webview`) en vez de una librería de formato basada en
  insertar símbolos markdown en un `TextInput` plano — decisión
  explícita del usuario, informado de que la alternativa liviana tenía
  cero riesgo de los bugs de Android sin resolver reportados contra
  esa librería (teclado que no aparece, editor que nunca inicializa en
  ciertos dispositivos) y aun así prefirió WYSIWYG real. Ver
  design.md para el detalle de esa decisión y el estado de
  verificación en vivo.

## Fuera de este spec

- Navegador/selector de carpetas existentes ("Mover a…", picker con
  autocompletado, crear/renombrar carpetas) — desktop lo resuelve con
  un submenú de carpetas ya creadas (`NoteList.tsx`/`NoteEditor.tsx`
  `moveTo`); mobile solo expone `folder` como campo de texto libre en
  el modal de carpeta. Se difiere porque construir un picker real
  requeriría una fuente de "carpetas existentes" (consulta `DISTINCT
  folder`) y una superficie de navegación que hoy no existe en ninguna
  pantalla de mobile.
- Renombrar, duplicar, copiar, exportar una nota, y el resto del menú
  contextual de desktop — cubierto por `menu-contextual-notas/` (spec
  separado, en progreso a partir de 2026-08-29).
- Cualquier lógica de sync.
- Extensiones de formato más allá de las que trae
  `TenTapStartKit`/`DEFAULT_TOOLBAR_ITEMS` de tentap-editor (tablas,
  imágenes, colores, resaltado, checklist) — se usa el set por defecto
  de la librería, sin bridges custom (ver design.md, por qué evitar el
  "advanced setup").
