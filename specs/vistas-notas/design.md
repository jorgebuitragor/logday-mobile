# Vistas de Notes — Design

Estado: implementado — ver `app/(tabs)/notes.tsx`,
`src/components/ViewSwitch.tsx`.

## `ViewSwitch` (extraído 2026-08-30)

Vivía como JSX inline en `app/(tabs)/index.tsx` (segmented control
Lista/Calendario de Tasks, ver `vistas-tasks/design.md`). Al necesitar
el mismo control acá (Lista/Cuadrícula) se extrajo a
`src/components/ViewSwitch.tsx`, genérico en el tipo de modo (`<T
extends string>`) porque Tasks y Notes tienen sets de modos distintos
y no relacionados — no tiene sentido un enum compartido tipo
`AppViewMode` entre dos pantallas que no comparten conceptos.
`app/(tabs)/index.tsx` se actualizó para usar el mismo componente
extraído, sin cambio de comportamiento.

## Por qué la cuadrícula no reusa `FlatList` con `numColumns`

`FlatList` sí soporta `numColumns` nativamente, pero se optó por un
`ScrollView` + `View` con `flexWrap: 'wrap'` en su lugar — la razón es
la sección "Destacadas"/"Otras" (estilo Keep): con `numColumns` todo
el dataset es una sola grilla continua, no hay forma nativa de
insertar un header de sección a mitad de una grilla de 2 columnas sin
romper el alineado (`SectionList` tampoco soporta `numColumns` en React
Native). Con `flexWrap` manual, cada sección es simplemente otro
`<View style={grid}>` con sus propias tarjetas — sin virtualización,
aceptable para el volumen de datos de un usuario personal (mismo
razonamiento que "por qué LIKE y no FTS5" en `busqueda/design.md`).

## Tarjeta (`NoteCard`)

Sin ícono de pin individual dentro de la sección "Destacadas" —
redundante con el título de sección, mismo criterio que usa Keep (el
pin identifica la sección, no cada tarjeta suelta). Sigue envuelta en
`SwipeableRow` (swipe-para-eliminar) porque es el único camino de
borrado desde el listado — `NoteActionsSheet` deliberadamente no
ofrece "Eliminar" (ver `menu-contextual-notas/design.md`), así que
perderlo en la vista Cuadrícula habría sido una regresión funcional,
no solo visual.

Vista previa más larga que en Lista (180 caracteres / hasta 6 líneas,
vs. 80 caracteres / 1 línea) — la tarjeta tiene más alto disponible al
no competir por ancho con una fila completa de metadata, y es
justamente el tipo de diferencia que hace útil tener una segunda
vista (más contexto por nota visible sin abrirla, a cambio de ver
menos notas por scroll que en Lista).

## Bug de ancho de tarjeta (corregido 2026-08-30)

Reportado en vivo tras el primer deploy: las tarjetas se veían
angostas e inconsistentes, con mucho espacio vacío a la derecha de la
fila. Causa: `width: '47%'` vivía en `styles.card`, aplicado al
`Pressable` interno de `NoteCard` — pero la raíz real de cada ítem de
la fila `grid` es `SwipeableRow` (un `Swipeable` de gesture-handler),
que no fuerza un ancho propio. El `47%` del `Pressable` resolvía
entonces contra el ancho (indefinido) del contenedor interno de
`Swipeable`, no contra el ancho de la fila `grid` — tamaño errático en
vez de la mitad exacta del ancho disponible.

Corregido moviendo el `width: '47%'` a un `View` envolvente
(`cardWrap`) puesto directamente como hijo de `grid`, con
`SwipeableRow`/`NoteCard` adentro sin ancho propio (heredan 100% de
`cardWrap` por defecto). Mismo patrón a tener en cuenta si se agrega
algo más envuelto en `SwipeableRow` dentro de un layout `flexWrap`
(no en una columna simple, donde el 100% por defecto ya coincidía con
el ancho deseado y ocultaba el problema).

## Explícitamente pendiente

Ver "Fuera de este spec" en `requirements.md`.
- Verificación en vivo: cambiar entre Lista/Cuadrícula sin perder
  notas cargadas; los filtros de carpeta/tag siguen aplicando en
  Cuadrícula; destacar/quitar destacado desde el editor mueve la nota
  entre secciones al volver al listado; swipe-para-eliminar funciona
  en una tarjeta de ancho medio (el umbral de swipe es el mismo que en
  Lista, ~100px, proporcionalmente mayor en una tarjeta angosta — a
  confirmar que no se siente incómodo en la práctica).
