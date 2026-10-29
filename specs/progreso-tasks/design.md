# Progreso de tareas — Design

Estado: implementado (pendiente confirmación en vivo).

## Validación: `src/lib/taskProgress.ts`

Un solo módulo con la regla, usado por la capa de datos, el mapeo de
sync y el formulario:

- `isValidProgress(value)`: `null` o entero 0–100. `createTask` y
  `updateTask` (`src/db/tasks.ts`) lanzan si no se cumple: el formulario
  ya lo impide, esto es la última barrera para no recibir el 400 del
  servidor (`progress must be an integer between 0 and 100, or null`).
- `progressFromServer(value)`: lo que llega del servidor. Ausente o
  inválido → `null`.
- `parseProgressText(text)`: el texto del formulario. Vacío → `null`;
  solo dígitos (`40.5`, `-1`, `1e2` o `40%` son error aunque `Number()`
  acepte algunos).

## Migración local

`initDb` (`src/db/index.ts`) llama
`ensureColumn('tasks', 'progress', 'INTEGER')`, el mismo patrón que
`content_state` de notes y daily_entries: `PRAGMA table_info` y
`ALTER TABLE ... ADD COLUMN` solo si falta. No se agregó al `CREATE
TABLE` de `schema.ts` (que queda con un comentario): así hay un único
camino, el mismo para instalaciones nuevas y previas.

Sin `DEFAULT` (las filas viejas quedan en `NULL`) y sin `CHECK`: un
`CHECK` haría fallar el upsert de un cambio remoto mal formado y
frenaría el pull; en su lugar, todo lo que se escribe ya pasó por
`isValidProgress` o `progressFromServer`.

## Capa de datos y sync

- `Task.progress: number | null` y `TaskInput.progress`.
- `TASK_INPUT_KEYS` incluye `progress`, así que `updateTask` lo compara
  contra la base del formulario (`diffChangedFields`, `===`: `0 → null`
  es un cambio) y solo lo guarda y lo manda si el usuario lo tocó.
- `syncMapping.ts`: `TaskCreatePayload.progress` siempre presente;
  `TaskPatchPayload.progress` opcional (`null` borra); `TaskApiResponse`
  con `progress?` y `taskFromApiResponse` vía `progressFromServer`.
  `TASK_FIELD_MAP.progress` hace que el guard "cola gana"
  (`hasNewerQueuedField`) lo cubra en `applyTaskResponse` y
  `applyRemoteTaskChange`.
- Cola offline: no cambia. Guarda el payload ya mapeado; una entrada
  encolada antes de esta versión no trae la clave, y el servidor lo
  interpreta bien (create de tarea nueva → sin progreso; PATCH → no lo
  toca).
- Consecuencia de "ausente = `null`": contra un servidor anterior a
  logday-server#15, el eco del POST/PATCH devuelve la tarea sin la
  clave y el progreso local se borra. Es lo que pide el contrato; con
  el servidor actualizado no pasa.

## Interfaz

- `src/components/TaskProgressBar.tsx`: pista de 4 px (`borderCard`)
  con relleno `accent` y el porcentaje en `textHint`, con
  `accessibilityRole="progressbar"`. La fila del listado
  (`app/(tabs)/index.tsx`) la pone en la línea de metadatos, después
  del vencimiento; la tarjeta del Kanban, igual pero más estrecha.
- `TaskForm`: sección "Progreso (opcional)" justo después de "Estado":
  campo `number-pad` de 3 caracteres con `%`, barra de vista previa,
  botón ✕ para quitarlo (solo si hay texto), atajos 0/25/50/75/100 y
  una pista o un error debajo. Con error, el botón de guardar queda
  deshabilitado.
- Teclado: el formulario pasó de `View` a `ScrollView`, con el patrón
  de Ajustes y el editor de notas (`useAnimatedKeyboard` como espacio
  al final y `scrollInputIntoView` al enfocar). Se aplica al campo de
  progreso y al de contenido, el último del formulario.
  `keyboardDismissMode="on-drag"` cierra el `number-pad`, que en iOS no
  tiene tecla de cerrar. "Eliminar" de la pantalla de edición pasó a
  ser el `footer` del formulario para quedar dentro del mismo scroll.

## Alternativas descartadas

- Slider: no viene en React Native core (sería una dependencia nueva) y
  es impreciso con el dedo; el campo numérico y los atajos cubren lo
  mismo.
- `0` como "sin progreso": rompe el contrato (`null` ≠ `0`).
