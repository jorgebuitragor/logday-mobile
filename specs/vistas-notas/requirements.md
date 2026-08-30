# Vistas de Notes — Requirements

Estado: implementado, pendiente de confirmación en vivo.

## Contexto

Pedido directo del usuario, en el mismo hilo de "más vistas en tareas":
"vistas como las de keep notes" para Notes — específicamente
Lista/Cuadrícula, no un port de nada de desktop (desktop no tiene
ningún concepto de "vista" para el listado de notas, solo
`NoteList.tsx` como lista simple — se confirmó al revisar el código
antes de preguntar, ver `vistas-tasks/requirements.md` para el
contraste con Tasks, que sí tiene 3 `ViewMode` en desktop). Es una
vista mobile-original, no un port.

## Requisitos (EARS)

- La pantalla de Notes DEBERÁ ofrecer un selector de vista
  (Lista/Cuadrícula) visible en todo momento, mismo componente
  (`ViewSwitch`) que ya usa la pantalla de Tasks para Lista/Calendario.
- El selector NO DEBERÁ persistir entre reinicios de la app — mismo
  criterio que el de Tasks.
- La vista Cuadrícula DEBERÁ mostrar las notas en 2 columnas, cada
  tarjeta con título y una vista previa del contenido más larga que la
  de la vista Lista (hasta 6 líneas vs. una sola línea recortada).
- La vista Cuadrícula DEBERÁ separar las notas destacadas (`pinned`)
  en una sección "Destacadas" arriba, seguida de "Otras" — estilo
  Google Keep — en vez de mezclarlas con un ícono de pin por tarjeta
  como hace la vista Lista.
- Los filtros de carpeta/tag ya existentes DEBERÁN aplicar igual en
  ambas vistas (se filtran antes de separar por destacadas/otras).
- El botón "⋮" (menú de acciones) y el swipe-para-eliminar DEBERÁN
  seguir disponibles en la vista Cuadrícula — son los únicos caminos
  de borrado desde el listado (`NoteActionsSheet` no ofrece Eliminar a
  propósito, ver `menu-contextual-notas/`), no se pueden perder al
  cambiar de vista.

## Fuera de este spec

- Colores por nota (Google Keep permite elegir un color de fondo por
  nota) — cambio de esquema de datos (columna nueva, sync), no pedido
  explícitamente, fuera de alcance de este checkpoint.
- Imágenes/adjuntos en notas — no existen en el modelo de datos actual
  de ninguna plataforma (mobile ni desktop).
- Reordenar notas arrastrando en la cuadrícula (Keep permite
  reordenar manualmente) — el orden sigue siendo `updated_at`
  descendente, igual que la vista Lista.
- Persistir la vista elegida entre reinicios — mismo alcance reducido
  que ya se documentó para Tasks.
