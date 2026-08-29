# Acciones desde la lista — Requirements

Estado: implementado, pendiente de confirmación en vivo.

## Contexto

Desktop ofrece editar/eliminar (y más) directamente desde cada fila de
lista vía menú contextual (click derecho) o botones que aparecen al
pasar el mouse (`TaskContextMenu.tsx`, menú contextual de
`NoteList.tsx`). Mobile no tiene ni click derecho ni hover — el
equivalente táctil estándar es **swipe para revelar acciones**
(mismo patrón que Mail/Notes en iOS), no un long-press con action
sheet ni una réplica pixel-a-pixel del menú de desktop.

## Requisitos (EARS)

- Cada fila de las 4 listas (Tasks, Notes, Dailys, Overtime) DEBERÁ
  revelar, al deslizar hacia la izquierda, dos acciones: Editar y
  Eliminar.
- "Editar" DEBERÁ navegar a la misma pantalla que tocar la fila
  directamente (no hay una acción de edición distinta de abrir el
  formulario).
- "Eliminar" DEBERÁ pasar por el flujo de confirmación de
  `confirmacion-eliminar/requirements.md` — no eliminar directo
  ignorando la preferencia del usuario.

## Fuera de este spec

- Cambio rápido de estado sin abrir el formulario (ej. marcar Task
  como "done" desde la lista) — existe en el menú contextual de
  desktop, no se portó; sigue accesible abriendo la task.
- Reordenar/arrastrar filas.
- Menú contextual con más de 2 acciones (copiar, duplicar, mover,
  etc. — existen en desktop para Notes) — fuera de alcance por ahora.
