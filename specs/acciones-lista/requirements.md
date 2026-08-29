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
  revelar Eliminar al deslizar hacia la izquierda, y disparar la
  eliminación cuando el swipe se completa (pasa el umbral y se suelta)
  — no requiere un tap adicional sobre un botón (agregado
  2026-08-29, corrige la versión anterior que sí lo requería).
- El sistema NO DEBERÁ ofrecer una acción de "Editar" en el swipe
  (retirado 2026-08-29) — tocar la fila ya navega a la edición, un
  botón de swipe duplicaba esa misma acción sin aportar nada.
- "Eliminar" DEBERÁ pasar por el flujo de confirmación de
  `confirmacion-eliminar/requirements.md` — no eliminar directo
  ignorando la preferencia del usuario, ni siquiera al eliminar por
  swipe completo.

## Fuera de este spec

- Cambio rápido de estado sin abrir el formulario (ej. marcar Task
  como "done" desde la lista) — existe en el menú contextual de
  desktop, no se portó; sigue accesible abriendo la task.
- Reordenar/arrastrar filas.
- Menú contextual con más de 2 acciones (copiar, duplicar, mover,
  etc. — existen en desktop para Notes) — fuera de alcance por ahora.
