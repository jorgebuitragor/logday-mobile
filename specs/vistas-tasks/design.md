# Vistas de Tasks — Design

Estado: Calendario y Kanban implementados — ver
`src/components/TaskCalendarView.tsx`, `src/components/TaskKanbanBoard.tsx`,
`app/(tabs)/index.tsx`.

## Selector de vista, persistido (agregado 2026-08-30)

`viewMode` (`TasksViewMode`) pasó de estado local
(`useState` en `app/(tabs)/index.tsx`) a `PreferencesContext`
(`tasksViewMode`/`setTasksViewMode`), persistido en `AsyncStorage`
— mismo mecanismo que `confirmDestructiveActions`/`timeFormat`, ya
establecido ahí. Cambio contenido, tal como se anticipó al dejarlo
fuera de alcance la primera vez: mover el `useState` al contexto, sin
tocar SQLite ni el esquema local. Mismo tratamiento para Notes
(`notesViewMode`, ver `vistas-notas/design.md`) en el mismo cambio.

## `TaskCalendarView` — por qué no reusa `AppCalendarGrid`

`AppCalendarGrid` (`selector-fecha/`) ya existe y resuelve "grilla de
mes navegable con celdas por día", pero está diseñada para un modal
angosto de selección de fecha: celdas fijas de 32px, sin espacio para
nada más que el número del día. Acá la grilla ocupa el ancho completo
de un tab (celdas con `flexBasis: '14.28%'`, más altas, con una fila
de puntos de estado debajo del número) — un contexto visual
suficientemente distinto como para no forzar el mismo componente con
props condicionales; se reimplementó el mismo algoritmo de celdas (42
celdas fijas, mismo motivo: que el alto no salte entre meses de 4/5/6
semanas) como componente aparte.

`STATUS_DOT_COLOR` se redefine local acá (no se importa desde
`app/(tabs)/index.tsx`) — 3 líneas de duplicación, distinto propósito
visual (puntos de calendario vs. ícono de estado), no vale la pena
unificar.

## `TaskStatusIcon` — extraído al aparecer el segundo consumidor

`STATUS_COLOR`/el ícono por estado vivían como `renderStatusIcon`/
`STATUS_COLOR` locales en `app/(tabs)/index.tsx`. Al necesitar el
mismo ícono en las tarjetas del Kanban (`TaskKanbanBoard.tsx`) se
extrajo a `src/components/TaskStatusIcon.tsx` — mismo criterio usado
en todo este proyecto: extraer recién cuando aparece el segundo
consumidor real, no antes.

## Kanban (agregado 2026-08-30) — `TaskKanbanBoard.tsx`

Puerto conceptual de `KanbanBoard.tsx` de desktop: 3 columnas por
estado (Por hacer/En progreso/Hecho), tarjeta arrastrable entre
columnas. El drag-and-drop de mouse de desktop (HTML5 drag events) no
traduce 1:1 a táctil, así que el gesto se reconstruye reusando el
mismo patrón ya probado en Dailys (`DailyActivityList.tsx`/
`daily/[date].tsx`, mover actividades entre paneles Previo/
Seleccionado):

- `dragX`/`dragY` como Reanimated `SharedValue<number>`, escritas
  directo en el hilo de UI dentro de `onUpdate` del gesto — sin
  re-render de React en cada frame de arrastre.
- Un fantasma flotante (`DragGhost`) dentro de un `Modal` (`transparent
  statusBarTranslucent`) — mismo motivo que en Dailys: esta pantalla
  tiene su propio header (acá el header nativo de `Tabs`), que
  desplaza el origen de coordenadas locales; `Modal` da un origen
  relativo a la ventana completa, consistente con `e.absoluteX/Y` del
  gesto.
- `measureInWindow` sobre 3 refs (una por columna) en el momento de
  soltar (`onEnd`), no durante el arrastre — evita recalcular hit-boxes
  en cada frame y es agnóstico a la posición de scroll horizontal de
  las columnas.

### Por qué `Gesture.Race(Tap, Pan)` y no un ícono de grip dedicado

A diferencia de las actividades de Dailys (que compiten con un tap
para editar inline el texto, y por eso necesitan un grip separado para
desambiguar), una tarjeta del Kanban solo tiene un significado posible
para un toque corto: abrir la task. Eso permite componer
`Gesture.Race(Gesture.Tap(), Gesture.Pan().activateAfterLongPress(250))`
directo sobre toda la tarjeta — el `Tap` resuelve primero en un toque
normal; el `Pan` se activa solo tras 250ms sostenidos, momento en el
que el `Tap` ya no puede ganar la carrera.

### Sin reordenar dentro de una columna

Se confirmó en el código de desktop (`KanbanBoard.tsx`) que soltar una
tarjeta solo llama `updateTask({...task, status})` — no existe un
campo de orden/posición persistido, ni siquiera en desktop. Por eso
mobile tampoco lo implementa: sería una funcionalidad nueva sin
equivalente de referencia, no un port. `onStatusChange` solo se llama
al soltar sobre una columna con `status` distinto al de origen.

### Layout: por qué `flex: 1` en ambos `ScrollView` (bug corregido antes de terminar)

La primera versión ponía `contentContainerStyle` solo en el
`ScrollView` horizontal exterior (sin `style={{flex:1}}`) y
`maxHeight: '100%'` en cada columna — un porcentaje de alto no se
resuelve sin que el padre tenga un alto definido, y los hijos de un
`ScrollView` horizontal no se estiran verticalmente por defecto. Se
corrigió agregando `style={styles.scroll}` (`flex:1`) al `ScrollView`
exterior, `alignItems:'stretch'` a su `contentContainerStyle`, quitando
`maxHeight` de la columna, y agregando `style={styles.columnScroll}`
(`flex:1`) al `ScrollView` vertical interno de cada columna.

## Panel del día seleccionado

Debajo de la grilla, no en un panel lateral como desktop (`w-72`
sidebar) — no hay espacio horizontal en una pantalla de teléfono en
vertical. Toda la vista Calendario (grilla + panel) vive dentro de un
`ScrollView` en `index.tsx` (no dentro de `TaskCalendarView`) porque
el panel puede crecer con la cantidad de tasks del día seleccionado y
necesita poder desplazar la grilla hacia arriba.

## Explícitamente pendiente

Ver "Fuera de este spec" en `requirements.md`.
- Verificación en vivo: navegar meses hacia adelante/atrás; tocar un
  día con tasks y confirmar que los puntos de color coinciden con el
  estado real de cada task; tocar una task del panel y confirmar que
  navega a la pantalla correcta; tocar un día vacío y confirmar el
  estado vacío; deseleccionar un día tocándolo de nuevo.
- Verificación en vivo del Kanban: arrastrar una tarjeta a otra
  columna y confirmar que cambia de estado y persiste; soltar fuera de
  cualquier columna y confirmar que no cambia nada; tocar una tarjeta
  con un toque corto y confirmar que navega (sin arrastrar); scroll
  horizontal entre columnas y scroll vertical dentro de una columna con
  muchas tasks; confirmar que el fantasma sigue el dedo sin parpadeos
  ni desfases, incluso con el header de `Tabs` visible.
