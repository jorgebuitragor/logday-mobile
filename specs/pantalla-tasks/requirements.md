# Pantalla de Tasks — Requirements

Estado: en diseño.

## Contexto

`navegacion/requirements.md` dejó explícitamente fuera de alcance las
pantallas de creación/edición/detalle por entidad. Este es el primer
spec de ese tipo — **Tasks**, la primera entidad del MVP y el primer
tab. Notes/Dailys/Overtime tendrán su propio spec análogo después
(fase por fase, no todo a la vez).

## Requisitos (EARS)

### Listado

- El tab "Tasks" DEBERÁ mostrar la lista real de tasks no eliminadas
  (`deleted_at IS NULL`) leídas de SQLite local, no el placeholder de
  conteo — reemplaza lo que dejó `navegacion/`.
- Cada fila DEBERÁ mostrar al menos título y estado.
- El sistema DEBERÁ ofrecer una acción visible para crear una task
  nueva desde el listado.

### Creación

- El sistema DEBERÁ permitir crear una task con: título (obligatorio),
  estado (`todo`/`in-progress`/`done`, default `todo`), fecha de
  vencimiento (opcional) y contenido (opcional, markdown plano).
- Al guardar, el sistema DEBERÁ generar el `id` en el dispositivo
  (UUID) y setear `created`/`updated_at` al momento de creación —
  mismo requisito heredado de `esquema-datos/requirements.md`.

### `project`/`tags`/`taskCode` en el formulario (agregado 2026-08-29)

Reemplaza la reducción de alcance original de esta sección ("NO DEBERÁ
exponer `project`/`tags`"): tras revisar `TaskEditor.tsx`/`TaskList.tsx`
de desktop, ambos campos son parte real del modelo de tarea (no
accesorios), así que se incorporan al formulario:

- El sistema DEBERÁ permitir editar `project` como texto libre (sin
  selector de proyectos existentes — desktop tiene un dropdown
  alimentado por su store de proyectos conocidos, que mobile no tiene
  todavía; ver "Fuera de este spec").
- El sistema DEBERÁ permitir agregar/quitar `tags` (lista de strings),
  persistidos como el JSON-string-array que ya define
  `esquema-datos/design.md` para la columna `tags`.
- El sistema DEBERÁ permitir editar `taskCode` (código corto opcional,
  único por task, como en desktop) — se normaliza a mayúsculas y solo
  caracteres `[a-zA-Z0-9-_]`, igual que `TaskEditor.tsx`/`TaskList.tsx`
  de desktop. Si el código coincide con el de otra task no eliminada,
  el sistema DEBERÁ impedir guardar y mostrarlo como error inline
  (mismo criterio que el toast bloqueante de desktop, adaptado a un
  estado de validación en el formulario en vez de un toast).

### Cambio rápido de estado desde el listado (agregado 2026-08-29)

- Cada fila del listado DEBERÁ ofrecer un ícono de estado que, al
  tocarlo, cicle el estado de la task (`todo` → `in-progress` →
  `done` → `todo`) sin abrir el formulario completo — adaptación
  táctil del menú contextual de estado de `TaskContextMenu.tsx` en
  desktop (que en mobile no tiene equivalente por gesto de clic
  derecho).
- Al transicionar a `done`, el sistema DEBERÁ sellar `completed_at`
  (si no estaba seteado ya); al salir de `done`, DEBERÁ limpiarlo —
  mismo criterio que `appStore.updateTask` en desktop.

### Contexto adicional en cada fila (agregado 2026-08-29)

- Cada fila DEBERÁ mostrar, además de título y estado: `taskCode` (si
  existe), `project` (si existe y no es `inbox`), `due` (con
  indicación visual si está vencida y la task no está `done`) y hasta
  3 `tags` — mismo contenido que muestra `TaskRow` en `TaskList.tsx`
  de desktop, sin las variantes de layout específicas de escritorio
  (hover, menú contextual de clic derecho).

### Edición

- El sistema DEBERÁ permitir editar los mismos campos que la creación
  para una task existente, actualizando `updated_at`.
- El sistema DEBERÁ permitir marcar una task como eliminada
  (soft-delete: `deleted_at`), no borrarla físicamente — coherente con
  el esquema ya definido.

## Fuera de este spec

- Selector de proyecto existente para `project` (dropdown como en
  desktop) — mobile no tiene todavía un store de "proyectos
  conocidos"; por ahora es texto libre (agregado 2026-08-29, ver
  arriba).
- `linked_paths` (archivos/carpetas vinculados a una task) — ni
  siquiera existe como columna en el esquema SQLite de mobile
  (`src/db/schema.ts`); es una noción ligada al sistema de archivos de
  escritorio (`fs.openInSystem`) sin equivalente directo en un
  dispositivo móvil sandboxeado.
- Filtros de estado en el listado (`filterAll`/`filterTodo`/...  de
  desktop) — el ciclo táctil de estado por fila cubre parcialmente la
  necesidad; se revisita si la lista crece lo suficiente para que
  filtrar deje de ser opcional.
- Vistas kanban/calendario (existen en `task-manager` desktop, no en
  este MVP).
- Editor de texto enriquecido (`RichTextEditor` de desktop) —
  contenido sigue siendo markdown plano, mismo criterio que
  `esquema-datos/design.md`.
- Cualquier lógica de sync — sigue bloqueada (ver
  `arquitectura-inicial/design.md`).
