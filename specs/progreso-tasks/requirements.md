# Progreso de tareas — Requirements

Estado: implementado (pendiente confirmación en vivo). Depende de
logday-server#15.

## Contexto

`Task.progress` es un porcentaje opcional nuevo del modelo compartido:
entero de 0 a 100, o `null` = sin progreso. `null` no equivale a `0`:
"sin progreso" es la tarea que no lleva porcentaje, `0` es la que lo
lleva y va en cero. Lo pidió la extensión de OpenProject de Desktop
(`percentageDone` de un work package), y cualquier tarea puede usarlo.
El contrato lo fija `logday-server/specs/esquema-datos/requirements.md`
("Progreso de tareas", 29 oct 2026).

## Requisitos (EARS)

### Datos locales

- El sistema DEBERÁ guardar `progress` en la tabla local `tasks` como
  `INTEGER` nullable, sin valor por defecto: las tareas que ya existían
  quedan sin progreso, no en 0.
- La columna DEBERÁ agregarse también en instalaciones previas, sin
  perder datos.
- El sistema NO DEBERÁ guardar en SQLite ni mandar al servidor un valor
  que no sea `null` o un entero entre 0 y 100.

### Sync

- Al crear una tarea, el sistema DEBERÁ mandar la clave `progress` en
  el `POST /tasks` (`null` si no tiene).
- Al editar, el sistema DEBERÁ mandar `progress` en el `PATCH` solo si
  el usuario lo cambió (mismo criterio base/cambios que el resto de
  campos), con `null` para quitarlo.
- Al leer una respuesta de `POST`/`PATCH` o un cambio de
  `/sync/changes`, el sistema DEBERÁ tratar la clave ausente igual que
  `null` (un servidor anterior al campo no la manda).
- Una edición de `progress` todavía en cola DEBERÁ tener prioridad
  sobre una respuesta o un cambio remoto que llegue mientras tanto
  (mismo guard "cola gana" que el resto de campos).

### Interfaz

- Cuando la tarea tenga progreso (incluido `0`), la fila del listado y
  la tarjeta del Kanban DEBERÁN mostrar una barra fina con el
  porcentaje. Sin progreso no DEBERÁN mostrar nada.
- El formulario de crear/editar DEBERÁ ofrecer un campo numérico 0–100,
  atajos de un toque (0/25/50/75/100) y una acción para quitarlo
  (dejarlo sin progreso).
- Si el texto no es un entero de 0 a 100, el sistema DEBERÁ marcar el
  campo como error y no dejar guardar.
- El teclado NO DEBERÁ tapar el campo al enfocarlo.
- Colores del tema activo (claro y oscuro) y textos en es/en.

## Fuera de este spec

- Editar el progreso desde el listado o el Kanban sin abrir el
  formulario.
- Ordenar o filtrar por progreso.
- Relación automática entre `progress` y `status` (por ejemplo, 100 →
  `done`): son campos independientes en los 3 clientes.
