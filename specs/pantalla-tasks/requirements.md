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
- El sistema NO DEBERÁ exponer `project`/`tags` en el formulario de
  esta fase — reducción de alcance deliberada para el primer corte;
  quedan en su valor default (`''`/`[]`) hasta un spec futuro que
  decida cómo se editan (selector de proyecto existente vs texto
  libre, etc.).
- Al guardar, el sistema DEBERÁ generar el `id` en el dispositivo
  (UUID) y setear `created`/`updated_at` al momento de creación —
  mismo requisito heredado de `esquema-datos/requirements.md`.

### Edición

- El sistema DEBERÁ permitir editar los mismos campos que la creación
  para una task existente, actualizando `updated_at`.
- El sistema DEBERÁ permitir marcar una task como eliminada
  (soft-delete: `deleted_at`), no borrarla físicamente — coherente con
  el esquema ya definido.

## Fuera de este spec

- `project`/`tags` editables.
- Vistas kanban/calendario (existen en `task-manager` desktop, no en
  este MVP).
- Cualquier lógica de sync — sigue bloqueada (ver
  `arquitectura-inicial/design.md`).
