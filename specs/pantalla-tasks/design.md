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
- `softDeleteTask(id)` — `UPDATE tasks SET deleted_at = ?`.

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
segmentados, `due` como texto libre `YYYY-MM-DD`, contenido como
`TextInput multiline`) que recibe `initialValue` (vacío en creación,
la task cargada en edición) y `onSubmit`. `[id].tsx` además ofrece un
botón "Eliminar" que llama `softDeleteTask` y vuelve a la lista.

`due` como texto libre en vez de un date picker nativo: reducción de
alcance deliberada — un date picker decente en RN implica elegir
librería (`@react-native-community/datetimepicker` u otra) y no hay
señal de que la fricción de escribir `YYYY-MM-DD` a mano sea un
problema real todavía. Se revisita si resulta molesto en el uso real.

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

- `project`/`tags` en el formulario.
- Confirmación antes de eliminar (hoy el botón "Eliminar" actúa
  directo) — se agrega si en el uso real resulta ser un problema.
- Date picker real para `due`.
