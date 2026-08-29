# Acciones desde la lista — Design

Estado: implementado — ver `src/components/SwipeableRow.tsx`.

## `react-native-gesture-handler` (`Swipeable`)

`SwipeableRow` envuelve la fila y usa `Swipeable.renderRightActions`
(API clásica de RNGH v2, no la variante Reanimated) para mostrar dos
botones (Editar/Eliminar) al deslizar. Requiere `GestureHandlerRootView`
envolviendo toda la app — agregado en `app/_layout.tsx` como wrapper
más externo (antes de `ThemeProvider`), requisito de la librería en
Android para que los gestos funcionen fuera del árbol raíz.

Un solo componente reusado en las 4 listas (`app/(tabs)/index.tsx`,
`notes.tsx`, `dailys.tsx`, `overtime.tsx`), parametrizado por
`onEdit`/`onDelete`/labels — no hay lógica específica de entidad
dentro de `SwipeableRow`.

## Por qué swipe y no long-press + action sheet

Ambos son patrones táctiles válidos; se eligió swipe porque:

- Es descubrible sin instrucción (el usuario ve el borde de la fila
  "engancharse" al arrastrar).
- No bloquea toda la pantalla como un action sheet — se puede cerrar
  deslizando de vuelta o tocando fuera.
- Es el patrón más directamente análogo a "acciones reveladas sin
  abrir nada" que es lo que el hover/click-derecho da en desktop.

## Explícitamente pendiente

Ver "Fuera de este spec" en `requirements.md`.
