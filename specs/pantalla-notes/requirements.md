# Pantalla de Notes — Requirements

Estado: implementado, incluyendo paridad funcional con desktop para
`pinned`/`folder`/`tags` (agregado 2026-08-29) y formato de texto vía
toolbar de markdown (agregado 2026-08-29, ver "Editor" abajo — un
editor WYSIWYG real se probó el mismo día y se revirtió por bugs en
vivo, ver design.md "Reversión a toolbar de markdown").

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

### Formato de texto — toolbar de markdown (agregado 2026-08-29, reescrito el mismo día tras revertir el WYSIWYG)

- El contenido de una nota DEBERÁ editarse en un `TextInput` de texto
  plano (markdown), con una barra de formato (negrita, cursiva,
  código, cabeceras H1/H2, lista con viñetas, lista numerada, cita,
  enlace) que envuelve/antepone tokens de markdown sobre la selección
  actual — no un editor WYSIWYG.
- El dato sigue almacenándose como markdown (`notes.content`, mismo
  esquema, mismo formato que desktop) sin ninguna conversión — el
  `TextInput` edita el string tal cual se guarda.
- **Historial de esta decisión**: se implementó primero un editor
  WYSIWYG real (`@10play/tentap-editor`, TipTap sobre un WebView) por
  pedido explícito del usuario, quien fue informado de antemano del
  riesgo (issues abiertos y sin resolver en GitHub sobre Android:
  teclado que no aparece, editor que nunca inicializa) y aun así
  prefirió esa opción. Al probarlo en vivo el usuario reportó "muchos
  bugs" — coincidiendo con el riesgo advertido — y pidió revertir a la
  alternativa liviana que se le había recomendado originalmente. Ver
  design.md, "Reversión a toolbar de markdown".

### Vista previa (agregado 2026-08-29)

- El sistema DEBERÁ ofrecer un botón que alterne entre editar el
  contenido (`TextInput` + `MarkdownToolbar`) y ver el markdown
  renderizado (títulos, negrita, cursiva, código, listas, citas,
  enlaces con estilo, no el texto crudo con símbolos) — mismo
  concepto que los modos "Fuente"/"WYSIWYG" de desktop, simplificado a
  un toggle de dos estados en vez de tres modos (no hay modo "Split"
  — la pantalla es angosta).
- El título NO entra en el toggle — sigue siendo siempre un
  `TextInput` editable, en ambos modos (no es markdown, no tiene nada
  que "previsualizar").
- Vista previa vacía (nota sin contenido) DEBERÁ mostrar un mensaje,
  no un área en blanco indistinguible de un error.

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
- Editor WYSIWYG real — probado y revertido (ver arriba); si se
  retoma en el futuro, debe ser una decisión nueva del usuario, no
  asumida por defecto.
- Formato multilínea desde la toolbar (aplicar cabecera/lista/cita a
  cada línea de una selección de varias líneas a la vez) — cada botón
  solo afecta la línea donde empieza la selección, ver design.md.
- Modo "Split" (edición y vista previa lado a lado, como desktop) —
  solo hay un toggle de dos estados, ver "Vista previa" arriba.
- Tablas, Mermaid, imágenes remotas y el resto de extensiones que
  `react-native-markdown-display` no cubre de fábrica sin
  configuración adicional.
