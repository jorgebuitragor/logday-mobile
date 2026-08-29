# Acciones desde la lista — Design

Estado: implementado — ver `src/components/SwipeableRow.tsx`.

## `react-native-gesture-handler` (`Swipeable`)

`SwipeableRow` envuelve la fila y usa `Swipeable.renderRightActions`
(API clásica de RNGH v2, no la variante Reanimated). Requiere
`GestureHandlerRootView` envolviendo toda la app — agregado en
`app/_layout.tsx` como wrapper más externo (antes de `ThemeProvider`),
requisito de la librería en Android para que los gestos funcionen
fuera del árbol raíz.

Un solo componente reusado en las 4 listas (`app/(tabs)/index.tsx`,
`notes.tsx`, `dailys.tsx`, `overtime.tsx`), parametrizado por
`onDelete`/`deleteLabel` — no hay lógica específica de entidad dentro
de `SwipeableRow`.

## Sin acción de "Editar" en el swipe (agregado 2026-08-29)

La primera versión mostraba dos botones (Editar/Eliminar) al deslizar.
El usuario pidió quitar el swipe-para-editar — tocar la fila ya abre
la edición (cada pantalla define ese `onPress`), así que el botón
duplicaba la misma acción. `SwipeableRow` ya no acepta `onEdit`/
`editLabel`.

## Eliminar deslizando por completo (agregado 2026-08-29)

En vez de requerir soltar el swipe y luego tocar un botón, `Swipeable`
ahora usa `onSwipeableOpen` (se dispara cuando el swipe pasa
`rightThreshold` y se suelta) para llamar `onDelete` directo y cerrar
la fila — deslizar del todo elimina, sin un segundo tap. El fondo rojo
con el ícono `Trash2` sigue siendo el feedback visual durante el
gesto, ya no es un botón separado por tocar (aunque sigue siendo
posible: si el swipe llega al threshold y se suelta ahí, dispara igual
sin importar si se ve como "abierto" un instante). La confirmación
antes de borrar (ver `confirmacion-eliminar/`) sigue aplicando igual —
`onDelete` en cada pantalla sigue siendo `confirmDelete.request(...)`,
`SwipeableRow` no sabe nada de esa lógica.

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
