# Menú contextual de Notes — Requirements

Estado: implementado (incluye ampliación 2026-08-30, ver más abajo),
pendiente de confirmación en vivo.

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
  nota, operando sobre la nota de esa fila.
- La hoja DEBERÁ ofrecer, como mínimo: Copiar, Compartir, Duplicar,
  Exportar.
- **Copiar** DEBERÁ copiar al portapapeles el contenido en el mismo
  formato que desktop: `"# {título}\n\n{contenido}"` si hay título, o
  solo el contenido si no lo hay.
- **Compartir** (agregado 2026-08-29, sin equivalente en desktop —
  desktop no tiene hoja de compartir del sistema) DEBERÁ abrir
  directo la hoja de compartir nativa del SO con el mismo texto que
  Copiar, sin escribir ningún archivo — mismo texto, dos destinos
  distintos (portapapeles vs. compartir directo a otra app). Ver
  `exportacion/requirements.md`, "Compartir" para el criterio general.
- **Duplicar** DEBERÁ crear una nota nueva con el mismo
  contenido/carpeta/tags, título con sufijo `" (copia)"` (o solo
  `"(copia)"` si el título original está vacío — mismo criterio que
  `duplicateNote` de desktop), destacado reseteado a `false`, y
  navegar directo a la copia.
- **Exportar** DEBERÁ abrir el selector de formato, ver
  `exportacion/requirements.md`.

## Requisitos (EARS) — Ampliación desde la lista (agregado 2026-08-30)

Pedido explícito del usuario: "incluye más opciones en el menú
contextual de la lista, como editar nota, eliminar nota, fijar
nota... no importa que ya estén dentro de la edición de la nota: para
que el usuario tenga de forma rápida todas las posibles opciones con
sus notas". Revierte la reducción de alcance original de esta sección
para el caso específico de **la lista** — las mismas acciones siguen
sin duplicarse dentro del editor (ver "Fuera de este spec"), porque
ahí ya tienen un botón propio en la barra superior y agregarlas
también al menú "⋮" sería redundante dentro de la misma pantalla. Solo
la hoja abierta **desde la lista** (`app/(tabs)/notes.tsx`) las
ofrece.

- La hoja, abierta desde la lista, DEBERÁ ofrecer además: **Editar**
  (navega directo al editor — mismo destino que tocar la fila/tarjeta
  en cualquier otro punto), **Destacar/Quitar destacado**, **Carpeta**
  (editar sin abrir el editor completo), **Tags** (agregar/quitar sin
  abrir el editor completo), y **Eliminar** (con el mismo flujo de
  confirmación que el swipe, al final de la lista de acciones,
  separado por una línea divisoria — mismo criterio visual que
  desktop, que pone Eliminar al final de su menú contextual).
- **Carpeta** y **Tags**, al tocarse, DEBERÁN abrir un modo dentro de
  la misma hoja (no una pantalla nueva) con el mismo campo/comportamiento
  que sus modales equivalentes dentro del editor — reusa los mismos
  textos (`noteForm.folderModalTitle`, `noteForm.tagsModalTitle`,
  etc.), no duplica el criterio con textos nuevos.
- **Eliminar** desde la hoja DEBERÁ convivir con el swipe-para-eliminar
  ya existente (`SwipeableRow`) — dos caminos al mismo resultado a
  propósito, no un reemplazo del gesto.
- Mantener presionada una fila/tarjeta de la lista (Lista o Cuadrícula)
  DEBERÁ abrir la misma hoja que el botón "⋮" — pedido explícito del
  usuario, un segundo camino de descubrimiento además del botón
  visible (mantener presionado es un gesto conocido de "más opciones"
  en Android/iOS, aunque el botón "⋮" siga siendo el camino principal
  y visible). Alcance acotado a listados de ítems individuales (Notes)
  — los encabezados de mes de Dailys/Overtime no son "un ítem de
  lista" en el mismo sentido, quedan fuera.

## Fuera de este spec

- **Renombrar** (como acción separada, tipo inline-rename sin abrir el
  editor): sin equivalente propio — "Editar" (agregado 2026-08-30)
  navega al editor completo, donde el título ya es un campo siempre
  editable; no se implementó un campo de renombrado inline dentro de
  la hoja.
- **Editar tags/Mover a…/Destacar** — **dentro del editor** (no desde
  la lista, ver arriba): siguen sin aparecer en la hoja ahí, porque ya
  tienen un botón propio en la barra superior de esa misma pantalla
  (`pantalla-notes/design.md`, "Editor simplificado") — agregarlas
  también al menú sería un segundo camino al mismo resultado sin
  aportar nada, dentro de la misma pantalla.
- **Mostrar en Finder/Explorador**: desktop-only (acceso al sistema de
  archivos), sin equivalente en mobile.
- **Eliminar dentro del editor**: sigue siendo solo el botón visible
  propio de la barra superior (con confirmación) — no se agrega
  también al menú "⋮" del editor, mismo razonamiento que el resto de
  esta lista.
