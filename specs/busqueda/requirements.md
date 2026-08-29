# Búsqueda global — Requirements

Estado: implementado, pendiente de confirmación en vivo.

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

## Fuera de este spec

- Ranking por relevancia — coincide o no, orden por
  fecha/actualización descendente dentro de cada grupo.
- Búsqueda con operadores (comillas, exclusión, etc.).
- Atajo de teclado (no aplica en mobile).
