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

Dos modos internos (`mode: 'actions' | 'export'`), sin navegación
propia — evita crear una ruta/pantalla nueva solo para el selector de
formato:

- `'actions'`: Copiar, Duplicar, Exportar (con ícono `Share2`).
- `'export'`: vuelve a mostrar la lista pero con los 3 formatos
  (Markdown/Texto plano/PDF, con subtítulo explicando la extensión —
  mismo texto que el modal `ExportModal` de desktop, ver
  `exportacion/design.md`), y una fila "atrás" arriba para volver a
  `'actions'`.

El modo se resetea a `'actions'` cada vez que `visible` pasa a `true`
(`useEffect`) — si el usuario exportó la vez anterior y reabre el
menú, no debería reaparecer en el submenú de formatos.

## Por qué Renombrar/Editar tags/Mover a…/Destacar NO están acá

Estas 4 acciones de desktop ya tienen un hogar propio en la barra
superior del editor de mobile (pin/carpeta/tags — ver
`pantalla-notes/design.md`, "Editor simplificado") porque esa barra
existe justamente para las acciones "secundarias pero frecuentes"
sacadas del cuerpo del formulario. Ponerlas TAMBIÉN en este menú
sería un segundo camino al mismo resultado sin aportar nada — se
prefiere una única superficie por acción.

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

## Desde la lista (agregado 2026-08-29)

`app/(tabs)/notes.tsx` reusa `NoteActionsSheet` sin cambios — el
componente ya era agnóstico de "en qué pantalla vive", solo recibe
callbacks. La diferencia está en el lado que llama:

- Un solo estado `actionsNote: Note | null` (en vez de operar sobre
  refs del editor como hace `note/[id].tsx`) guarda qué fila abrió el
  menú; los 3 handlers (`handleCopyNote`/`handleDuplicateNote`/
  `handleExportNote`) reciben la `Note` completa como parámetro.
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
