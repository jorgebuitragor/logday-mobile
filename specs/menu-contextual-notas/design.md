# Menú contextual de Notes — Design

Estado: implementado — ver `src/components/NoteActionsSheet.tsx`,
`app/note/[id].tsx`, `app/(tabs)/notes.tsx`.

## `NoteActionsSheet`

Modal con `Pressable` de fondo (mismo patrón que `ConfirmDeleteModal`
y los modales de carpeta/tags ya existentes en `note/[id].tsx`), pero
anclado abajo (`justifyContent: 'flex-end'`, esquinas superiores
redondeadas) en vez de centrado — convención de "hoja de acciones"
(action sheet / bottom sheet) más habitual en mobile que un diálogo
centrado para un menú de opciones.

4 modos internos (`mode: 'actions' | 'export' | 'folder' | 'tags'`,
los últimos dos agregados 2026-08-30), sin navegación propia — evita
crear rutas/pantallas nuevas solo para un selector o un campo:

- `'actions'`: fila base (Copiar, Compartir, Duplicar, Exportar) más,
  condicionalmente según qué callbacks se pasaron (ver "Props
  opcionales" más abajo), Editar/Destacar-Quitar/Carpeta/Tags arriba y
  Eliminar al final tras una línea divisoria.
- `'export'`: sin cambios — 3 formatos (Markdown/Texto plano/PDF) con
  subtítulo, fila "atrás" arriba.
- `'folder'` (nuevo): fila "atrás" + un `TextInput` con el mismo
  placeholder/comportamiento que el modal de carpeta del editor, más
  un botón "Guardar carpeta".
- `'tags'` (nuevo): fila "atrás" + chips de los tags actuales (cada
  uno con su × para quitar) + input para agregar uno nuevo + botón
  "Listo".

El modo se resetea a `'actions'` cada vez que `visible` pasa a `true`
(`useEffect`) — mismo criterio que antes, extendido: también
re-sincroniza el draft de carpeta (`folderDraft`) desde el prop
`folder` en ese momento, no en cada render, para no pisar lo que el
usuario esté escribiendo.

## Props opcionales (agregado 2026-08-30) — por qué el editor no cambia

`pinned`/`folder`/`tags`/`onEdit`/`onTogglePin`/`onSaveFolder`/
`onAddTag`/`onRemoveTag`/`onDelete` son todos opcionales. El editor
(`app/note/[id].tsx`) sigue sin pasarlos — ya tiene su propio botón en
la barra superior para pin/carpeta/tags/eliminar (ver
`pantalla-notes/design.md`, "Editor simplificado"), así que agregar
esas mismas filas también al menú "⋮" **dentro del editor** sería un
segundo camino redundante al mismo resultado, dentro de la misma
pantalla. La lista (`app/(tabs)/notes.tsx`) sí pasa los 9 — pedido
explícito del usuario de tener "todas las posibles opciones" rápido
desde ahí, sin abrir la nota primero, aunque ya existan dentro del
editor. Este patrón (props opcionales que agregan filas condicionales)
es intencional: un solo componente sirve a los dos contextos con
distinto alcance, en vez de dos variantes casi-duplicadas.

## Compartir (agregado 2026-08-29)

`shareText(content)` (`src/lib/exportFile.ts`) usa el `Share` nativo
de React Native (`Share.share({ message: content })`) — no
`expo-sharing`, que solo comparte *archivos* ya escritos a disco.
"Compartir" no escribe ningún archivo: abre directo la hoja de
compartir del SO con el texto como mensaje, útil para mandar la nota
por WhatsApp/email/Slack sin el paso intermedio de "elegir un
formato" que sí tiene sentido para "Exportar" (que si necesita un
archivo real, para poder abrirlo en otra app o guardarlo). Mismo
contenido que "Copiar" (`buildMarkdownDoc`), dos mecanismos de salida
distintos.

## Copiar y Duplicar — reuso de lógica de exportación

`buildMarkdownDoc(title, content)` vive en `src/lib/noteExport.ts`
(no en este componente ni en `note/[id].tsx`) porque "Copiar" usa
exactamente el mismo formato `"# título\n\ncontenido"` que el export
a Markdown — una sola función, dos consumidores (`Clipboard.setStringAsync`
vs. escribir a un archivo), en vez de reimplementar el mismo criterio
dos veces.

`handleDuplicate` (`app/note/[id].tsx`) llama `createNote` (mismo
`src/db/notes.ts` que ya existía) y navega con `router.replace` a la
copia — no hay una función `duplicateNote` dedicada en la capa de
datos como en desktop, porque acá "duplicar" es solo "crear con
campos precargados", ya cubierto por `createNote` sin necesitar una
query nueva.

## Desde la lista (agregado 2026-08-29; ampliado 2026-08-30)

`app/(tabs)/notes.tsx` reusa `NoteActionsSheet` — el componente ya era
agnóstico de "en qué pantalla vive", solo recibe callbacks (y ahora
también props opcionales de estado, ver arriba). La diferencia está en
el lado que llama:

- Un solo estado `actionsNote: Note | null` (en vez de operar sobre
  refs del editor como hace `note/[id].tsx`) guarda qué fila/tarjeta
  abrió el menú; los handlers reciben la `Note` completa como
  parámetro.
- `handleSaveFolderNote`/`handleAddTagNote`/`handleRemoveTagNote`
  llaman `updateNote(id, input)` directo (no hay un `updatePartial`
  en `db/notes.ts` — siempre se manda el `NoteInput` completo,
  reconstruido a partir de la `Note` ya cargada, título/contenido sin
  tocar). `handleAddTagNote`/`handleRemoveTagNote` además actualizan
  `actionsNote` en el momento (no solo `reload()`, que refresca la
  lista de fondo) para que los chips dentro de la hoja, todavía
  abierta, reflejen el cambio sin cerrarla y reabrirla — mismo
  comportamiento que el editor completo.
- `normalizeTag` (`src/lib/noteTags.ts`, agregado 2026-08-30, extraído
  de `app/note/[id].tsx` donde vivía local) — mismo criterio de
  normalización en los dos lugares que ahora editan tags
  (minúsculas, espacios → guiones), sin duplicar la regla.
- `handleTogglePinNote` llama `setNotePinned` (ya existía en
  `db/notes.ts`, sin usar desde la lista hasta ahora).
- Eliminar desde la hoja reusa `confirmDelete.request` — el mismo
  hook/modal de confirmación que ya dispara el swipe, no un segundo
  flujo de confirmación aparte.
- El botón "⋮" vive dentro de `titleRow`, como un `Pressable` anidado
  dentro del `Pressable` de la fila completa (que navega a la nota al
  tocar en cualquier otro punto) — RN resuelve la prioridad de toque
  al elemento interactivo más interno automáticamente (no hace falta
  `stopPropagation`, a diferencia de web), mismo patrón ya usado en
  `SwipeableRow` conviviendo con el tap de la fila.
- `title` pasa de `flexShrink: 1` a `flex: 1` para que el título
  absorba el espacio disponible y empuje el ícono de pin + el botón
  "⋮" al borde derecho de la fila, en vez de quedar pegados justo
  después del texto del título.
- Duplicar desde la lista navega con `router.push` (no `replace`,
  a diferencia de duplicar desde dentro del editor) — al volver atrás
  desde la copia, el usuario regresa al listado, no a la nota
  original, que es el punto de partida real acá.

## Mantener presionado (agregado 2026-08-30)

`onLongPress` de `Pressable` (RN core, sin gesture-handler ni
dependencia nueva) en la fila de Lista y en la tarjeta de Cuadrícula,
llamando el mismo `setActionsNote(item)`/`onMore` que ya dispara el
botón "⋮" — no un flujo distinto, el mismo destino por dos gestos. No
hay conflicto con `SwipeableRow` (que envuelve ambas): `Swipeable`
solo intercepta el gesto de pan horizontal más allá de un umbral, deja
pasar tap/long-press del `Pressable` hijo sin pelear por el gesto,
igual que ya pasaba con `onPress`.

## Explícitamente pendiente

- Verificación en vivo (agregado 2026-08-30) de la ampliación desde la
  lista: Editar navega a la nota correcta; Destacar/Quitar destacado
  actualiza el listado (mueve la nota entre secciones en la vista
  Cuadrícula); Carpeta/Tags guardan y los chips de tags se actualizan
  sin cerrar la hoja; Eliminar dispara la misma confirmación que el
  swipe; ninguna fila queda cortada o mal alineada.
- Riesgo a vigilar: el teclado tapando el input de carpeta/del nuevo
  tag dentro de la hoja — mismo tipo de bug que ya se dio con
  `MarkdownToolbar` (ver `pantalla-notes/design.md`, "Safe area y
  teclado"), no resuelto acá todavía porque esta hoja no tiene el
  mismo `useAnimatedKeyboard` que se le agregó al editor. Si se
  reporta en vivo, aplicar el mismo fix.
