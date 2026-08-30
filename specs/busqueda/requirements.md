# Búsqueda global — Requirements

Estado: implementado (búsqueda base + filtros + ranking), pendiente de
confirmación en vivo.

## Contexto

**Extiende deliberadamente el alcance de desktop, no lo iguala.**
`task-manager/src/components/SearchModal.tsx` busca solo en Tasks
(vía un comando nativo, probablemente ripgrep sobre archivos) y Dailys
(client-side en memoria) — Notes tiene su propio buscador interno
separado (`NoteList.tsx`, `searchPlaceholder`) y Overtime no tiene
búsqueda en absoluto. El usuario pidió explícitamente "búsqueda en
todas las secciones" — se interpretó como las 4 entidades del MVP
mobile en un solo lugar, no como igualar el alcance parcial de
desktop.

## Requisitos (EARS)

- El sistema DEBERÁ ofrecer un acceso a búsqueda global desde
  cualquier tab (ícono en el header).
- La búsqueda DEBERÁ cubrir las 4 entidades: Tasks (título+contenido),
  Notes (título+contenido), Dailys (contenido), Overtime
  (actividad+solicitada por).
- Los resultados DEBERÁN agruparse por entidad, cada grupo con su
  título y hasta 10 resultados.
- Tocar un resultado DEBERÁ navegar directamente a su pantalla de
  edición/detalle.
- La búsqueda NO DEBERÁ requerir mínimo de más de 2 caracteres antes
  de mostrar resultados (evita queries costosas por cada tecla en
  búsquedas de 1 carácter).

## Requisitos (EARS) — Precisión y filtros (agregado 2026-08-29)

Motivado por feedback directo del usuario ("falta añadir más vistas
en tareas... además de incluir filtros para búsquedas y hacer el
buscador universal más preciso") — dos problemas de precisión
detectados al revisar el código, no reportados como bug pero
confirmados al inspeccionar `search.ts` original:

- La búsqueda de Tasks DEBERÁ cubrir también `taskCode`, `project` y
  `tags` (antes solo título+contenido — un usuario buscando por código
  de tarea o por tag, campos que sí se muestran en cada fila del
  listado, no encontraba nada).
- La búsqueda de Notes DEBERÁ cubrir también `tags` y `folder` (mismo
  problema, mismo criterio).
- La búsqueda de Overtime DEBERÁ cubrir también `observaciones`
  (antes solo actividad+solicitada por).
- Los resultados DEBERÁN priorizar coincidencias de título sobre
  coincidencias en otros campos, y coincidencia exacta/al-inicio sobre
  coincidencia en cualquier posición — reemplaza el "Fuera de este
  spec" original de esta sección (ranking por relevancia), que quedó
  obsoleto tras el pedido explícito del usuario.
- El sistema DEBERÁ ofrecer un panel de filtros (colapsado por
  defecto, con contador de filtros activos en el botón que lo abre)
  con: filtro por sección (Tasks/Notes/Dailys/Overtime, multi-select),
  filtro por estado de task (Por hacer/En progreso/Hecho, multi-select,
  solo visible si Tasks está entre las secciones activas), filtro por
  proyecto/carpeta/tag (chips de valores conocidos en la base local,
  selección única) y filtro por rango de fecha (Desde/Hasta).
- El filtro de proyecto/tag DEBERÁ excluir del todo a Dailys/Overtime
  cuando está activo — ninguna de las dos entidades tiene ese
  concepto, mostrarlas de todas formas sería inconsistente con lo que
  el filtro dice estar haciendo.
- Un botón "Limpiar filtros" DEBERÁ estar visible solo cuando hay al
  menos un filtro activo.

## Fuera de este spec

- Búsqueda con operadores (comillas, exclusión, etc.).
- Atajo de teclado (no aplica en mobile).
- FTS5 / índices de texto completo — ver design.md, "Por qué LIKE y no
  FTS5 todavía".
