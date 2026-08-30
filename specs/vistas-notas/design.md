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

## Bug de alineación con el borde derecho (corregido 2026-08-30)

Segundo bug reportado en vivo, con captura, tras el fix de arriba: la
grilla ya no se veía "angosta e inconsistente", pero la fila no
llegaba hasta el mismo borde derecho que el `ViewSwitch` de arriba
(que sí usa el ancho completo con `margin: 16` simétrico) — quedaba
un espacio vacío notorio a la derecha de la segunda columna. Causa:
`grid` usaba `gap: 10` junto con `cardWrap.width: '47%'` — en algunas
versiones de Yoga (el motor de layout de RN), `gap` no siempre se
resta del espacio disponible antes de calcular anchos porcentuales,
así que `47% + 47% + gap` podía superar el 100% disponible o quedar
corto de forma inconsistente, dejando el remanente como espacio vacío
al final de la fila (el `flexWrap` row por defecto empaqueta a la
izquierda, `justifyContent: 'flex-start'`).

Corregido reemplazando `gap`+`width:'47%'` por
`justifyContent: 'space-between'` (sin `columnGap`, solo `rowGap`
para el espacio vertical entre filas) + `cardWrap.width: '48%'` —
`space-between` calcula el espacio entre las 2 tarjetas de forma
exacta a partir del ancho real de cada una, sin depender de que el
motor reste el `gap` correctamente primero. Patrón más confiable para
una grilla de columnas fijas en RN en general, no solo para este caso.

## De grilla de filas a columnas independientes (agregado 2026-08-30)

Tercer reporte en vivo, con captura, sobre la misma Cuadrícula:
espacios grandes e inconsistentes entre notas, ya con el ancho
corregido. Causa distinta a los 2 bugs anteriores — esta vez no era
un bug, era una limitación real de `flexWrap` como grilla: con filas
fijas de 2 columnas, la altura de cada fila la determina la tarjeta
más alta de esa fila; una tarjeta corta al lado de una larga deja un
hueco vacío visible debajo antes de que empiece la fila siguiente.
Es el comportamiento esperado de flexbox, no un valor mal calculado
como los 2 anteriores — por eso no se podía arreglar con otro ajuste
de `gap`/`width`.

Google Keep (la referencia que pidió el usuario desde el principio de
esta vista) no tiene ese problema porque no usa filas fijas: es una
cascada de 2 columnas independientes, donde cada nota nueva entra a
la columna que en ese momento está más corta, sin esperar a que la
otra columna "termine su fila".

`splitIntoColumns(notes)` replica esa idea con un reparto voraz
(greedy): por cada nota, se estima cuántas líneas va a ocupar su
tarjeta (`estimatedCardLines` — título, preview, fila de
carpeta/tags, todo aproximado por longitud de texto, no medido de
verdad) y se agrega a la columna con menor altura acumulada hasta ese
momento. No es una medición exacta (RN no tiene un `onLayout` previo
al primer render que permita medir antes de decidir en qué columna
va cada tarjeta sin parpadeo), pero alcanza para que una tarjeta
corta no deje un hueco grande esperando a una larga en la misma fila.

`NoteGrid` (nuevo, reemplaza el JSX duplicado que había para
Destacadas/Otras) renderiza las 2 columnas como `View`s `flex: 1`
lado a lado — ya no hace falta `cardWrap` con `width` explícito
(el bug de los 2 fixes anteriores): cada tarjeta es hija directa de
una columna `flex:1`, que ya estira sus hijos al 100% de su ancho por
default (`alignItems: 'stretch'`), mismo mecanismo que ya usaban las
filas de la vista Lista sin necesitar ancho explícito tampoco.

## Vista persistida entre reinicios (agregado 2026-08-30)

`viewMode` pasó de `useState` local a `usePreferences()`
(`notesViewMode`/`setNotesViewMode`, en `PreferencesContext.tsx`,
persistido en `AsyncStorage`) — pedido explícito del usuario: "me
gustaría también que las vistas se guarden así cierre la app". Mismo
cambio en Tasks (`tasksViewMode`), ver `vistas-tasks/design.md`. El
tipo `NotesViewMode` se movió de una definición local en
`app/(tabs)/notes.tsx` a `PreferencesContext.tsx` (fuente única).

## Explícitamente pendiente

Ver "Fuera de este spec" en `requirements.md`.
- Verificación en vivo: cambiar entre Lista/Cuadrícula sin perder
  notas cargadas; los filtros de carpeta/tag siguen aplicando en
  Cuadrícula; destacar/quitar destacado desde el editor mueve la nota
  entre secciones al volver al listado; swipe-para-eliminar funciona
  en una tarjeta de ancho medio (el umbral de swipe es el mismo que en
  Lista, ~100px, proporcionalmente mayor en una tarjeta angosta — a
  confirmar que no se siente incómodo en la práctica).
- Verificación en vivo (agregado 2026-08-30): las tarjetas de la
  cuadrícula llegan hasta el mismo borde derecho que el `ViewSwitch`;
  dejar la app en Cuadrícula (o Tasks en Calendario), cerrarla del
  todo y reabrirla — debe seguir en la misma vista.
- Verificación en vivo (columnas independientes, agregado 2026-08-30):
  con notas de largo bien distinto, las 2 columnas quedan
  razonablemente parejas en altura, sin un hueco grande debajo de una
  tarjeta corta; el orden de lectura (arriba-abajo, izquierda antes
  que derecha en cada nivel) sigue siendo intuitivo aunque ya no sea
  estrictamente "fila por fila".
