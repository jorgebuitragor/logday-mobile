# Menú contextual de Notes — Requirements

Estado: implementado, pendiente de confirmación en vivo.

## Contexto

`pantalla-notes/requirements.md` dejó fuera de alcance el menú
contextual (clic derecho) de `NoteList.tsx` en desktop, que ofrece:
Renombrar, Editar tags, Copiar, Duplicar, Destacar/Quitar destacado,
Mover a…, Mostrar en Finder/Explorador, Exportar, Eliminar. Este spec
cubre el subconjunto que tiene sentido portar a mobile.

Mobile no tiene clic derecho — el equivalente es un botón "⋮" que abre
una hoja de acciones (`NoteActionsSheet`) desde abajo. Disponible en
dos lugares (agregado 2026-08-29 el segundo): dentro del editor de una
nota, y en cada fila del listado — para poder duplicar/exportar/copiar
sin necesidad de abrir la nota primero, mismo alcance que el clic
derecho de desktop (que funciona tanto sobre la lista como dentro del
editor abierto).

## Requisitos (EARS)

- El sistema DEBERÁ ofrecer un botón "⋮" en la barra superior de la
  pantalla de nota (`app/note/[id].tsx`) que abra una hoja de acciones.
- El sistema DEBERÁ ofrecer el mismo botón "⋮" en cada fila del
  listado de notas (`app/(tabs)/notes.tsx`), sin necesidad de abrir la
  nota — mismas 3 acciones, operando sobre la nota de esa fila.
- La hoja DEBERÁ ofrecer, como mínimo: Copiar, Duplicar, Exportar.
- **Copiar** DEBERÁ copiar al portapapeles el contenido en el mismo
  formato que desktop: `"# {título}\n\n{contenido}"` si hay título, o
  solo el contenido si no lo hay.
- **Duplicar** DEBERÁ crear una nota nueva con el mismo
  contenido/carpeta/tags, título con sufijo `" (copia)"` (o solo
  `"(copia)"` si el título original está vacío — mismo criterio que
  `duplicateNote` de desktop), destacado reseteado a `false`, y
  navegar directo a la copia.
- **Exportar** DEBERÁ abrir el selector de formato, ver
  `exportacion/requirements.md`.

## Fuera de este spec

- **Renombrar**: sin equivalente táctil separado — el título ya es un
  campo siempre editable en el editor de mobile (a diferencia de
  desktop, donde el título se puede renombrar sin abrir el editor
  completo desde la lista). Abrir la nota y editar el título ya cubre
  el mismo resultado.
- **Editar tags**: ya existe como acción propia en la barra superior
  del editor (botón "Tags", ver `pantalla-notes/design.md`,
  "Editor simplificado") — no hace falta duplicarlo en este menú.
- **Mover a…**: ya existe como acción propia en la barra superior del
  editor (botón "Carpeta").
- **Destacar/Quitar destacado**: ya existe como acción propia en la
  barra superior del editor (botón de pin).
- **Mostrar en Finder/Explorador**: desktop-only (acceso al sistema de
  archivos), sin equivalente en mobile.
- **Eliminar**: ya existe como botón visible propio en la barra
  superior del editor (con confirmación) — no se duplica en este menú
  para no ofrecer dos caminos al mismo destino destructivo.
