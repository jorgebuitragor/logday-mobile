# Pantalla de Tasks — Design

Estado: implementado — ver `src/db/tasks.ts` y `app/(tabs)/index.tsx`,
`app/task/new.tsx`, `app/task/[id].tsx`.

## Capa de datos: `src/db/tasks.ts`

Funciones CRUD directas sobre `expo-sqlite` (sin ORM, coherente con
`esquema-datos/design.md`):

- `listTasks()` — `SELECT * FROM tasks WHERE deleted_at IS NULL ORDER BY created DESC`.
- `getTask(id)` — una fila o `null`.
- `createTask(input)` — genera `id` con `expo-crypto` (`randomUUID()`,
  no `crypto.randomUUID()` global directo, para no depender de que el
  runtime JS de turno lo soporte), `created`/`updated_at` = ahora
  (ISO 8601).
- `updateTask(id, patch)` — `UPDATE ... SET ..., updated_at = ?`.
- `updateTaskStatus(id, status)` (agregado 2026-08-29) — patch acotado
  a `status`/`completed_at`/`updated_at`, usado por el ciclo de estado
  táctil del listado; evita mandar el resto del formulario por un
  cambio de un solo campo.
- `softDeleteTask(id)` — `UPDATE tasks SET deleted_at = ?`.

### `taskCode`/`tags`/`project` (agregado 2026-08-29)

`createTask`/`updateTask` ahora leen/escriben `taskCode` (columna
`task_code`, `NULL` si vacío), `tags` (serializado con
`JSON.stringify`/parseado con `JSON.parse`, ya lo hacía `rowToTask` en
lectura) y `project` (texto plano) en vez de hardcodear
`NULL`/`'[]'`/`''`. `TaskInput` creció esos tres campos.

### `completed_at` (agregado 2026-08-29)

Antes existía en el esquema y se leía en `rowToTask`, pero ninguna
escritura lo tocaba. Ahora `createTask`/`updateTask`/`updateTaskStatus`
replican el criterio de `appStore.updateTask` en desktop: sella
`completed_at` a "ahora" (ISO 8601 completo — a diferencia de desktop,
que usa solo `YYYY-MM-DD`, para quedar consistente con el resto de
timestamps de este esquema, que ya son ISO 8601 completos) la primera
vez que una task pasa a `status: 'done'` (conservando la fecha previa
si ya estaba sellada), y lo limpia (`NULL`) si sale de `done`.

Mapeo fila↔`Task` (snake_case en SQL, camelCase en TS) vive en el
mismo archivo (`rowToTask`), no se generaliza a un mapper genérico
todavía — solo hay una entidad con esta capa por ahora.

## Rutas (Expo Router)

```
app/
  _layout.tsx          # Stack raíz: (tabs) sin header, task/* con header
  (tabs)/
    index.tsx           # lista de tasks (reemplaza el placeholder)
  task/
    new.tsx              # formulario de creación
    [id].tsx               # formulario de edición (carga por id)
```

`task/new.tsx` y `task/[id].tsx` viven fuera del grupo `(tabs)` a
propósito: son pantallas de pila completa (push desde la lista), no
tabs — mismo patrón que ya dejaba abierto `navegacion/design.md`
("Explícitamente pendiente: decidir si cada entidad necesita su propio
stack anidado").

`app/_layout.tsx` cambia de `screenOptions` global a declarar cada
ruta explícitamente:

```tsx
<Stack>
  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
  <Stack.Screen name="task/new" options={{ title: 'Nueva task', presentation: 'modal' }} />
  <Stack.Screen name="task/[id]" options={{ title: 'Editar task', presentation: 'modal' }} />
</Stack>
```

`presentation: 'modal'` porque es la interacción más simple para
crear/editar un solo registro sin perder el contexto de la lista
detrás.

## Formulario: un solo componente para crear y editar

`task/new.tsx` y `task/[id].tsx` comparten un componente
`src/components/TaskForm.tsx` (título, estado como 3 botones
segmentados, `project` y `taskCode` como texto libre, `due` con el
selector de fecha compartido (ver `selector-fecha/`), `tags` como
chips + input de agregar, contenido como `TextInput multiline`) que
recibe `initialValue` (vacío en creación, la task cargada en edición),
`currentId` (id de la task en edición, para el chequeo de `taskCode`
duplicado — ausente al crear) y `onSubmit`. `[id].tsx` además ofrece un
botón "Eliminar" que llama `softDeleteTask` y vuelve a la lista.

`due` usaba texto libre `YYYY-MM-DD` originalmente (reducción de
alcance deliberada); reemplazado 2026-08-29 por `AppDatePicker` — ver
`selector-fecha/design.md`, no se repite acá.

### `project`/`taskCode`/`tags` (agregado 2026-08-29)

- `project`: `TextInput` simple, sin autocompletar ni dropdown de
  proyectos existentes (a diferencia del `<select>` de desktop
  alimentado por `useAppStore().projects`) — mobile no tiene ese store
  todavía. Reducción de alcance documentada en `requirements.md`.
- `taskCode`: `TextInput` que normaliza a mayúsculas y filtra a
  `[a-zA-Z0-9-_]` en cada `onChangeText` (mismo regex que
  `handleTaskCodeChange` en `TaskEditor.tsx` de desktop). `TaskForm`
  carga `listTasks()` una vez al montar para poder comparar contra los
  `taskCode` existentes (excluyendo `currentId`); si hay colisión,
  bloquea el submit (`canSubmit`) y muestra un texto de error inline
  en vez del toast bloqueante que usa desktop (`showToast` no tiene
  equivalente en mobile todavía).
- `tags`: lista de chips con botón "×" para quitar, más un
  `TextInput` + botón "+ tag" para agregar (equivalente táctil del
  input inline con `onKeyDown`/Enter de desktop). Se guarda como el
  mismo JSON-string-array que ya define la columna `tags`.

## Fila del listado: ícono de estado táctil + contexto (agregado 2026-08-29)

`app/(tabs)/index.tsx` amplía cada fila más allá de título+estado:

- Ícono de estado (`Circle`/`Clock`/`CheckCircle2` de `lucide-react-native`,
  mismo set que `STATUS_ICONS` en `TaskList.tsx` de desktop) como
  `Pressable` propio dentro de la fila — tocarlo cicla el estado
  (`todo` → `in-progress` → `done` → `todo`) vía `updateTaskStatus`,
  con actualización optimista del estado local antes de esperar la
  escritura en SQLite. Es la adaptación táctil elegida para el menú
  contextual de estado de `TaskContextMenu.tsx` (que depende de
  clic derecho, sin equivalente directo en touch); se prefirió sobre
  un long-press porque es descubrible sin gesto oculto y de un solo
  toque, igual de rápido que el menú de desktop.
- Fila de metadatos (si hay algo que mostrar): `#taskCode`, `project`
  (si no es `inbox`), `due` con ícono de calendario (color de aviso
  fijo si está vencida y la task no es `done` — mismo umbral que
  `isOverdue` en `TaskRow` de desktop) y hasta 3 `tags` como chips.
  Los colores de estado/vencido son valores fijos (no de
  `ThemeTokens`) a propósito, igual que desktop, donde esos matices
  (ámbar/verde/rojo) tampoco cambian entre claro/oscuro — son
  semántica de estado, no color de UI.

## Refresco de la lista al volver

La lista (`app/(tabs)/index.tsx`) usa `useFocusEffect` de Expo Router
para recargar `listTasks()` cada vez que la pantalla vuelve a foco
(al volver de crear/editar) — no un store global ni contexto
compartido, porque con una sola pantalla de lista todavía no hay
necesidad de sincronizar estado entre múltiples consumidores.

## Nota de instalación: `.npmrc` con `legacy-peer-deps`

Instalar `expo-crypto` (y cualquier paquete nuevo de aquí en más)
falla con un conflicto ERESOLVE: `expo-router` trae transitivamente
`@expo/ui`/`vaul`/`@radix-ui/*` (soporte web) que piden
`react-dom@^19.2.8`, mientras el proyecto está en `react@19.2.3`. Esas
dependencias son web-only y no se ejecutan en Android/iOS. Se agregó
`.npmrc` con `legacy-peer-deps=true` en la raíz del repo para que
`npm install` no vuelva a fallar por esto.

## Explícitamente pendiente

- Selector de proyecto existente (dropdown) en vez de texto libre para
  `project` — ver "Fuera de este spec" en `requirements.md`.
- Date picker real para `due`.
- Filtros de estado en el listado (`filterAll`/`filterTodo`/... de
  desktop).

(La confirmación antes de eliminar y `project`/`tags` en el formulario,
listados aquí antes, ya están resueltos — ver `useConfirmDelete`/
`ConfirmDeleteModal` y la sección "`project`/`taskCode`/`tags`"
arriba, agregado 2026-08-29.)
