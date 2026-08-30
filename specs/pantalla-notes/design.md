# Pantalla de Notes — Design

Estado: implementado — ver `src/db/notes.ts`, `app/(tabs)/notes.tsx`,
`app/note/new.tsx`, `app/note/[id].tsx`, `src/components/MarkdownToolbar.tsx`.

Mismo patrón que `pantalla-tasks/design.md` — no se repite lo ya
establecido ahí (rutas fuera de `(tabs)`, `presentation: 'modal'`,
`useFocusEffect` para refrescar la lista). Diferencias puntuales:

- `listNotes()` ordena por `pinned DESC, updated DESC` (ver
  "Pinned" más abajo) — no solo `created` como `listTasks()`.
- No hay un `NoteForm`/formulario — ver "Editor simplificado" abajo,
  reemplaza por completo lo que este documento describía antes como
  "NoteForm" (componente eliminado 2026-08-29).
- La fila de lista muestra, además de título y preview: indicador de
  pin, `folder` (si tiene) y `tags` (si tiene) — ver "Fila de lista"
  más abajo.

A diferencia de `pantalla-tasks/` (construida antes de `temas/`/`i18n/`
y migrada después), esta pantalla se construyó **ya usando** los
tokens de tema y `t('...')` desde el primer commit — no hay paso de
retrofit acá.

## Pinned (agregado 2026-08-29)

- `src/db/notes.ts` agrega `setNotePinned(id, pinned)` — hace lo mismo
  que `toggleNotePin` en el store de desktop: pisa `pinned`, `updated`
  y `updated_at` a la vez (desktop llega a ese mismo efecto indirecto
  porque `toggleNotePin` reusa `updateNote`, que siempre refresca
  `updated`).
- `listNotes()` ordena `ORDER BY pinned DESC, updated DESC` — resuelve
  en SQL lo que desktop resuelve con un `.sort()` en memoria en
  `NoteList.tsx` (mismo resultado: notas ancladas arriba, y dentro de
  cada grupo la más reciente primero).
- El toggle de pin vive en la barra de herramientas de
  `app/note/[id].tsx` (ver "Editor simplificado" abajo), no en la fila
  de la lista ni detrás de un swipe. Se decidió así porque
  `acciones-lista/requirements.md` ya excluyó explícitamente "cambio
  rápido de estado sin abrir el formulario" como fuera de alcance (lo
  dice a propósito de Task, pero aplica igual acá). La fila de la
  lista sí **muestra** el estado con un ícono `Pin` relleno en ámbar
  (`#f59e0b`, mismo color fijo — no token de tema — que usa desktop
  para el indicador `text-amber-400`; incluye `accessibilityLabel`).

## Folder y tags (agregado 2026-08-29, reescrito 2026-08-29 al simplificar el editor)

- `src/db/notes.ts`: `NoteInput` tiene `folder: string` y
  `tags: string[]`; `createNote`/`updateNote` los persisten en las
  columnas SQLite que ya existían (`folder`, `tags` como JSON).
- Ya NO son campos de un formulario — son acciones de la barra de
  herramientas en `app/note/[id].tsx` (ver "Editor simplificado"):
  tocar el botón "Carpeta" abre un modal con un solo `TextInput`
  (texto libre, igual alcance que antes) + botón "Guardar carpeta";
  tocar "Tags" abre un modal con los chips existentes (removibles) +
  input para agregar uno nuevo. Normalización de tag nuevo idéntica a
  `handleAddTag` de `NoteList.tsx` en desktop: minúsculas, espacios →
  guiones, sin duplicados.
- La fila de lista (`app/(tabs)/notes.tsx`) muestra `folder` como texto
  chico y `tags` como chips con `theme.accentSoft`/`theme.accentInk` —
  mismos tokens que ya usa `TaskForm` para sus chips de tags.
- No hay picker de carpetas existentes — ver "Explícitamente
  pendiente".

## Editor simplificado (agregado 2026-08-29)

El usuario reportó que el formulario (título + contenido + carpeta +
tags, los 4 campos a la vez) "abrumaba" y pidió algo "más simple y
directo... solo título y texto". Investigar desktop mostró que **no
tiene un formulario en absoluto**: `createNote()` en `appStore.ts`
crea la nota vacía de inmediato y abre `NoteEditor.tsx` directo — el
"formulario" que tenía mobile antes (con los 4 campos a la vez) no
tenía equivalente real en desktop, era una invención de la primera
versión de esta pantalla. Se corrige portando el modelo real:

- **`app/note/new.tsx`** ya no muestra ningún formulario — en un
  `useEffect` llama `createNote({title:'', content:'', folder:'',
  tags:[]})` y navega con `router.replace('/note/' + id)` de inmediato
  (con un `ActivityIndicator` mientras tanto). El componente
  `NoteForm` que existía para create+edit se eliminó por completo (ya
  no tiene ningún uso).
- **`app/note/[id].tsx`** es ahora el único editor (sirve tanto para
  la nota recién creada vacía como para cualquier edición posterior).
  Su cuerpo principal es **solo** un `TextInput` de título (multilínea,
  auto-crece) + el editor de contenido (`RichText` de tentap-editor,
  ver "Editor de texto enriquecido" abajo) — nada más compite por
  atención. Una barra de herramientas fija arriba del cuerpo agrupa
  las acciones secundarias: destacar (toggle), carpeta (abre modal),
  tags (abre modal, muestra la cantidad si hay alguno), eliminar — en
  ese orden, con el botón eliminar empujado al extremo derecho
  (`flex:1` spacer).
- **Autosave, no botón "Guardar"**: título y contenido usan un
  debounce de 600ms compartido (`scheduleSave`/`flushSave` en
  `app/note/[id].tsx`) — mismo valor que `schedulesSave` en
  `NoteEditor.tsx` de desktop (línea 963). Carpeta/tags/destacado se
  guardan de inmediato al confirmarse (`persistNow`), sin debounce —
  son ediciones discretas, no tecleo continuo, mismo criterio que ya
  usa el resto de la app (Dailys, Overtime).
- **Por qué refs y no solo `useState` para el autosave**: el flush del
  debounce necesita leer título/carpeta/tags **al momento de disparar
  el timer**, no al momento de programarlo — si se leyeran de closures
  de `useState` capturadas en el momento del `setTimeout`, un segundo
  cambio antes de que venza el debounce se perdería (el timer viejo se
  cancela, pero si el nuevo closure capturó el valor viejo, se
  guardaría eso). Por eso `titleRef`/`folderRef`/`tagsRef` se
  actualizan de forma síncrona en cada cambio, y `flushSave`/
  `persistNow` siempre leen `.current` en vez de una variable
  capturada. El contenido no tiene este problema porque
  `editor.getHTML()` siempre pregunta el estado *actual* del WebView,
  no un valor capturado.

## Filtro por folder/tag (agregado 2026-08-29)

`app/(tabs)/notes.tsx` calcula `folders`/`tags` como los valores
distintos presentes en `notes` (`useMemo`, `Array.from(new Set(...))`,
ordenados alfabéticamente) y los muestra como chips horizontales
(`ScrollView horizontal`) sobre la lista, solo si hay al menos uno de
los dos. Cada grupo (folder, tag) es de selección única y togglea al
tocar de nuevo el chip activo (`filterFolder === folder ? null : folder`)
— mismo comportamiento que `filterTag`/`setFilterTag` en el dropdown
de ordenar de `NoteList.tsx` de desktop, adaptado a chips visibles en
vez de un menú desplegable (mobile no tiene el árbol de carpetas del
sidebar de desktop, así que folder se filtra igual que tag: por chip,
no por navegación jerárquica). Ambos filtros combinan con AND. Estado
vacío distinto cuando el filtro no tiene resultados
(`noteList.emptyFiltered`) vs. cuando no hay notas en absoluto
(`noteList.empty`), para no mostrar el CTA de "crea la primera" cuando
en realidad sí hay notas, solo que ninguna calza con el filtro activo.

## Formato de texto — historial y reversión (agregado 2026-08-29)

Desktop no edita markdown a mano — `NoteEditor.tsx` usa TipTap 3 (sobre
ProseMirror), un editor WYSIWYG real. TipTap es una librería de
DOM/`contentEditable` — no corre nativo en React Native.

**Intento 1 (revertido el mismo día): `@10play/tentap-editor`** — TipTap
corriendo dentro de un `WebView`. Se le presentaron al usuario los dos
caminos reales (WYSIWYG vía WebView vs. toolbar liviana de markdown
sobre un `TextInput`), se le advirtió explícitamente del riesgo (dos
issues abiertos y sin resolver en GitHub sobre Android: teclado que a
veces no aparece, editor que a veces nunca termina de inicializar), y
aun así prefirió WYSIWYG real. Se implementó (conversión markdown ⇄
HTML en `src/lib/noteMarkdown.ts` vía `markdown-it`/`turndown`, para no
necesitar la "advanced setup" de la librería que hubiera forzado salir
de Expo Go) y se pidió verificación en vivo antes de seguir con el
resto de la feature (menú contextual, exportación) — **precisamente
por ser la pieza de mayor riesgo**, siguiendo el criterio de checkpoints
por fase.

Al probarlo, el usuario reportó "muchos bugs" y pidió explícitamente
revertir a la alternativa liviana — el riesgo advertido se materializó.
Se revirtió por completo: `npm uninstall @10play/tentap-editor
react-native-webview markdown-it turndown` (+ sus `@types`), se borró
`src/lib/noteMarkdown.ts` (ya no hace falta ninguna conversión — el
contenido vuelve a ser el mismo string markdown de siempre, editado
directo).

**Implementación actual: `src/components/MarkdownToolbar.tsx`** —
nueve botones (negrita, cursiva, código, H1, H2, lista con viñetas,
lista numerada, cita, enlace) que operan sobre `content`/`selection`
de `app/note/[id].tsx`:

- Negrita/cursiva/código envuelven la selección actual con el token de
  markdown correspondiente (`**`/`_`/`` ` ``) y reposicionan la
  selección para que quede sobre el texto envuelto, no sobre los
  tokens — así un segundo toque sobre el mismo botón puede "desenvolver"
  visualmente si el usuario borra los símbolos a mano (no hay toggle
  automático de detección de "ya está en negrita", a diferencia de un
  editor real que sabe el estado del nodo).
- H1/H2/lista/cita anteponen (o quitan, si ya está) un prefijo a la
  **línea donde empieza la selección** — no a cada línea de una
  selección multilínea, simplificación deliberada para no reescribir
  un motor de bloques completo sobre texto plano.
- Enlace envuelve la selección (o inserta el placeholder "texto" si no
  hay selección) como `[texto](url)` y deja "url" preseleccionado para
  reemplazar directo.
- El `TextInput` de contenido es controlado en `selection` (`onSelectionChange`
  + prop `selection`) para que los botones sepan dónde envolver y para
  poder mover el cursor programáticamente después de cada acción — RN
  soporta esto pero es más frágil que un editor real; si en el uso
  real el cursor "salta" de forma rara tras usar un botón, es el punto
  a revisar primero.

## Safe area y teclado (agregado 2026-08-29)

Primera versión de `MarkdownToolbar`: el usuario reportó que quedaba
"muy abajo y muy pequeña", que el teclado la tapaba, y que "molesta un
poco con los gestos/botones de navegación de Android". Investigado:
**nada en la app montaba `SafeAreaProvider`** (`grep` en `app/`/`src/`
no encontró ni un solo uso de `useSafeAreaInsets`/`SafeAreaView` en
toda la app, a pesar de tener `react-native-safe-area-context` como
dependencia transitiva) — cualquier contenido pegado al borde inferior
quedaba literalmente debajo de la barra de gestos de Android, no solo
"cerca". Y no había ningún manejo de teclado (`KeyboardAvoidingView` o
equivalente) en esta pantalla — con edge-to-edge en Android,
`windowSoftInputMode=adjustResize` no siempre redimensiona solo el
árbol de vistas, así que la toolbar quedaba tapada en vez de empujada
arriba.

Dos fixes:

- **`SafeAreaProvider`** agregado en `app/_layout.tsx` (envolviendo
  todo, dentro de `GestureHandlerRootView`) — no existía en ningún
  lado del árbol, así que `useSafeAreaInsets()` no podía funcionar en
  ninguna pantalla hasta ahora. `MarkdownToolbar` usa
  `useSafeAreaInsets().bottom` como `paddingBottom` (con un mínimo de
  8px si el inset es 0, p.ej. en un dispositivo con barra de
  navegación clásica de 3 botones en vez de gestos).
- **`KeyboardAvoidingView`** envolviendo título + contenido + toolbar
  en `app/note/[id].tsx` (`behavior: 'padding'` en iOS, `'height'` en
  Android) — no depende de `windowSoftInputMode` del sistema, es RN
  escuchando los eventos de teclado directamente y encogiendo el alto
  disponible, así el `TextInput` de contenido (que tiene `flex:1`) se
  encoge y la toolbar queda empujada arriba del teclado.

También se agrandaron los botones (ícono `18→22`, y cada botón pasa a
`flex:1` en vez de `padding:8` fijo, para que la barra ocupe todo el
ancho en vez de verse como un grupo pequeño de íconos apretados a la
izquierda) — atiende el "muy pequeña" del reporte.

### Safe area y teclado (v2) — `KeyboardAvoidingView` no alcanzó (agregado 2026-08-29)

El usuario probó el fix anterior y mandó una captura: el teclado
seguía tapando la toolbar por completo (no se veía ni un pedazo de
ella arriba del teclado). `KeyboardAvoidingView` (con `behavior:
'height'` en Android) depende de que el módulo `Keyboard` clásico de
RN reciba eventos de altura correctos — con edge-to-edge activo en
Android, ese mecanismo no es confiable (es un problema conocido y
documentado del ecosistema RN/Expo, no un bug de esta implementación
puntual): a veces el evento no llega, a veces llega con una altura que
no coincide con el inset real, porque el sistema ya no redimensiona la
ventana de la forma tradicional que ese módulo espera.

**Fix real**: `useAnimatedKeyboard()` de `react-native-reanimated`
(ya instalado, ver `selector-fecha`/drag-and-drop de Dailys) — a
diferencia del módulo `Keyboard`, lee el inset nativo del teclado
directo (no eventos JS legacy), que sí es confiable bajo edge-to-edge.
Se reemplazó `KeyboardAvoidingView` por un `Animated.View` cuyo
`paddingBottom` es `useAnimatedStyle(() => ({ paddingBottom:
keyboard.height.value }))` — mismo efecto perseguido (encoger el
`TextInput` de contenido para empujar la toolbar arriba del teclado),
logrado desde una fuente de altura distinta. Se pasan
`isStatusBarTranslucentAndroid: true`/`isNavigationBarTranslucentAndroid:
true` a `useAnimatedKeyboard()` porque esta app ya es edge-to-edge
(barra de estado transparente, ver `app/_layout.tsx`) — sin esas
opciones el inset reportado no coincide con la superficie real
disponible.

Nota: `useAnimatedKeyboard` está marcado `@deprecated` en el propio
paquete de Reanimated, en favor de `react-native-keyboard-controller`
— no se usó ese reemplazo porque requiere código nativo propio
(probablemente fuerza salir de Expo Go, el mismo tipo de costo que ya
llevó a revertir el editor WYSIWYG). Se acepta el deprecation warning
por ahora; si en una versión futura de Reanimated se elimina la
función, este es el punto a revisar.

## Vista previa (agregado 2026-08-29)

Pedido del usuario tras la reversión del editor WYSIWYG: poder ver el
markdown renderizado, ya que ahora se edita como texto crudo con
símbolos visibles.

**Librería**: `react-native-markdown-display` — a diferencia de
`@10play/tentap-editor`, renderiza con componentes `Text`/`View`
nativos de React Native (internamente parsea con `markdown-it`, el
mismo parser que ya se había evaluado al investigar el editor
WYSIWYG), **sin WebView**. No arrastra el riesgo que llevó a revertir
el editor WYSIWYG (issues de Android sobre inicialización/teclado de
WebViews) porque no hay ningún WebView involucrado — es JS puro
renderizando árboles de componentes nativos, igual categoría de
librería que `markdown-it`/`turndown` que ya se habían evaluado como
seguras antes de descartarlas por otro motivo (no por riesgo, sino
porque ya no hacían falta tras revertir tentap-editor).

Nota sobre auditoría de dependencias: `npm install` reportó una
vulnerabilidad "high" (`linkify-it`, ReDoS por complejidad cuadrática
en su scanner de `mailto:`, sin fix disponible todavía) arrastrada por
`markdown-it` (dependencia de `react-native-markdown-display`). Riesgo
aceptado por ahora: es un problema de negación de servicio explotable
con texto adversarial, y el contenido que se renderiza acá es siempre
del propio usuario en su propio dispositivo (no hay sync ni contenido
remoto todavía) — no hay una superficie de ataque real hoy. Si en el
futuro las notas empiezan a sincronizarse desde otros dispositivos o
un servidor, este punto se vuelve relevante y hay que revisarlo de
nuevo.

**Toggle, no modos múltiples**: desktop ofrece tres modos
(WYSIWYG/Fuente/Split) porque su editor de fuente y el WYSIWYG son
piezas separadas que coexisten. Acá solo hay edición de texto plano,
así que el único par de estados con sentido es "editando" vs "viendo
el resultado" — un botón `Eye`/`EyeOff` en la barra superior
(`previewMode`, `app/note/[id].tsx`) alterna entre mostrar
`TextInput` de contenido + `MarkdownToolbar`, o un `ScrollView` con
`<Markdown>{content}</Markdown>`. El título nunca entra en el
toggle — sigue siendo un `TextInput` editable en ambos modos, arriba
del área que sí cambia.

**Tema**: `buildMarkdownStyle(theme)` (función a nivel de módulo en
`app/note/[id].tsx`) mapea `ThemeTokens` a las claves de estilo que
reconoce la librería (`body`, `heading1`-`6`, `strong`, `blockquote`,
`code_inline`, `code_block`, `fence`, `link`, etc. — nombres fijos de
la librería, no inventados, ver
`node_modules/react-native-markdown-display/src/lib/styles.js` para
la lista completa). No se tematizaron `table`/`th`/`td` (mobile no
tiene UI para crear tablas desde la toolbar, así que no hace falta
pulir su renderizado más allá del default de la librería).

## Indicador de guardado (agregado 2026-08-30)

Reportado en vivo por el usuario, con captura: "Al intentar añadir
una nota no hay botón de guardar/finalizar. Para saber que quedó y
verla en la lista el usuario debe dar en volver" — el editor
autoguarda (debounce de 600ms, ver arriba) pero no daba ninguna señal
visual de que eso hubiera pasado, a diferencia de Task/Overtime (que
sí tienen un botón "Crear"/"Guardar cambios" explícito, ver
`pantalla-tasks/`/`pantalla-overtime/`) — Notes es la única pantalla
de este proyecto con autoguardado silencioso sin ningún indicador.

`saveState: 'idle' | 'pending' | 'saved'` (nuevo, local a
`app/note/[id].tsx`) — arranca en `'idle'` (nada se muestra en una
nota recién abierta sin tocar), pasa a `'pending'` en
`scheduleSave()` (el momento en que se agenda el debounce, no cuando
termina de escribir) y a `'saved'` cuando `flushSave()`/`persistNow()`
efectivamente terminan de escribir en SQLite. Texto chico
("Guardando…"/"Guardado") en el espacio que antes era un separador
vacío en la barra superior (`View style={{flex:1}}` entre el botón
"⋮" y "Eliminar") — no se agregó un botón nuevo: la arquitectura de
autoguardado se mantiene igual en toda la pantalla, lo que faltaba
era la confirmación visual, no una acción de guardado manual (que
además rompería el patrón ya establecido de "todo se autoguarda" del
resto del editor).

No se tocó el flujo de navegación — "volver" (botón atrás del sistema
o de la barra) sigue siendo cómo se sale del editor, igual que en
cualquier app de notas (Apple Notes, Google Keep incluidas: no existe
un concepto de "cerrar/finalizar" separado de "navegar afuera"). El
indicador resuelve la pregunta real detrás del reporte ("¿esto ya
quedó guardado?"), no agrega una segunda forma de salir de la
pantalla.

~~**Nota de riesgo menor...**~~ — resuelto en "Descarte de notas
vacías" (abajo, 2026-08-30): el cleanup nuevo ya cancela el
`setTimeout` pendiente y hace el flush síncrono al salir, así que el
guardado ya no queda corriendo después de que la pantalla se
abandonó.

## Descarte de notas vacías al salir (agregado 2026-08-30)

Pregunta directa del usuario: "¿Qué comportamiento tiene la app para
notas vacías?" — la respuesta inicial fue incorrecta (se afirmó que
desktop no tenía ninguna lógica de limpieza); el usuario repreguntó
"¿Estás seguro que en desktop no hay lógica para borrar notas
vacías?", lo que llevó a revisar el código de desktop a fondo en vez
de confiar en el comentario de `note/new.tsx` (que solo hablaba de
"se crea vacía de inmediato", no de qué pasa después).

Desktop sí tiene la lógica, en `NoteList.tsx` (líneas 89-116, no en
`NoteEditor.tsx` ni en `appStore.ts`): `isNewEmptyNote` (`!!activeNote
&& !activeNote.title.trim() && !activeNote.content.trim()`) se
evalúa contra la nota activa, y `handleSelectNote` la descarta
(`deleteNote(toDiscard, { showToast: false })`, con una animación de
300ms) **solo cuando el usuario selecciona otra nota** desde el panel
dividido — no al cambiar de sección, no al cerrar la app. El nombre
de la variable ("nueva") es engañoso: el chequeo es genérico sobre el
estado actual, no sobre si la nota fue recién creada — una nota
existente a la que se le borra todo el título y contenido cae en el
mismo camino.

Mobile no tiene panel dividido (navega con `router.push`/`back`, la
lista no queda visible durante la edición), así que no hay un
"seleccionar otra nota" equivalente. El disparador que sí existe en
mobile y cumple el mismo propósito ("abandonar esta nota") es salir
de la pantalla. Usa `softDeleteNote` (marca `deleted_at`, no borra la
fila) en vez de un delete físico porque es la función de borrado ya
establecida en toda esta pantalla — la fila soft-deleted simplemente
no vuelve a aparecer en `listNotes()`.

### Primera versión (cleanup de `useEffect`) y por qué se reemplazó

La primera implementación ponía la lógica en el cleanup de un
`useEffect([id])`: al desmontar (o cambiar `id` sin desmontar, ej.
`handleDuplicate`), si título y contenido seguían vacíos, llamaba
`softDeleteNote(id)` sin esperar el resultado (un cleanup no puede
bloquear nada). El usuario reportó: "en ocasiones alcanzo a verla por
casi un segundo antes de que se borre la nota vacía". Causa: el
cleanup corre como reacción al desmontaje, que a su vez es
consecuencia de una navegación (`router.back()`, gesto, botón físico)
que ya estaba en curso — `app/(tabs)/notes.tsx` recupera el foco y
recarga (`useFocusEffect(reload)`) en paralelo, en carrera contra ese
`UPDATE ... SET deleted_at = ?` async. Cuando el `reload()` ganaba la
carrera, la lista pintaba la fila vacía por el tiempo que tardara el
`UPDATE` en terminar (variable, hasta ~1s reportado en el dispositivo
del usuario) antes de que un futuro `reload()` la hiciera desaparecer.

### Versión actual: listener `beforeRemove`

Se reemplazó por el listener `beforeRemove` de React Navigation (vía
`useNavigation()` de `expo-router`) — el patrón oficial para "hacer
algo async antes de irse de verdad de una pantalla" (el mismo que la
documentación de React Navigation usa para diálogos de "¿salir sin
guardar?", adaptado acá a un discard silencioso en vez de un diálogo):

```ts
const unsubscribe = navigation.addListener('beforeRemove', (e) => {
  const isEmpty = !titleRef.current.trim() && !contentRef.current.trim();
  const hadPendingSave = saveTimeoutRef.current !== null;
  if (!isEmpty && !hadPendingSave) return; // nada que hacer, dejar salir directo

  e.preventDefault();
  // ...cancela el debounce...
  const pending = isEmpty ? softDeleteNote(id) : updateNote(id, {...});
  pending.then(() => navigation.dispatch(e.data.action));
});
```

`e.preventDefault()` cancela la navegación en curso; solo al resolver
la promesa (borrado o flush) se repite la acción original con
`navigation.dispatch(e.data.action)`. Esto bloquea la navegación hasta
que SQLite ya tiene el cambio aplicado — ya no hay ninguna carrera
posible con el `reload()` de la lista, porque la lista no puede ganar
el foco antes de que la navegación efectivamente ocurra. Cubre back
por gesto, botón físico del sistema y `router.replace` (ej.
`handleDuplicate`) por igual, ya que las tres remueven la pantalla del
stack y por lo tanto disparan `beforeRemove`. Cuando no hay nada que
descartar ni flushear (caso común: nota con contenido, ya guardada),
el listener no llama `preventDefault` y la navegación sigue su curso
normal sin ningún retraso perceptible.

Efecto colateral positivo (ya presente desde la primera versión, se
mantiene): el mismo listener cancela el `setTimeout` de autoguardado
pendiente al salir y, si la nota no quedó vacía, hace el flush en su
lugar (ahora también bloqueando la salida hasta que termine) —
resuelve el "riesgo menor" ya documentado arriba en "Indicador de
guardado" (el guardado con debounce que seguía corriendo después de
abandonar la pantalla).

## Explícitamente pendiente

- Picker/autocompletado de `folder` a partir de carpetas existentes
  (en el modal de carpeta, no en el filtro — ese ya existe, ver
  arriba).
- Verificación en vivo (agregado 2026-08-30): el indicador cambia de
  "Guardando…" a "Guardado" tras escribir y dejar de tipear ~600ms;
  no aparece nada en una nota recién abierta sin editar; cabe bien en
  la barra superior sin romper el layout de los demás botones.
- Menú de más acciones (renombrar, duplicar, copiar, exportar, abrir
  en el sistema) — cubierto por `menu-contextual-notas/` (spec
  separado, en progreso).
- Exportación (Markdown/TXT/PDF, como desktop) — cubierto por
  `exportacion/` (spec separado, en progreso).
- Formato multilínea desde la toolbar, modo "Split", y reintroducir un
  editor WYSIWYG — ver "Fuera de este spec" en requirements.md.
- **Verificación en vivo pendiente** de la toolbar de markdown
  (confirmar que envolver texto con cada botón se siente natural, que
  el cursor no salta de forma inesperada) y de la vista previa
  (confirmar que el tema se ve bien en modo oscuro, y que el toggle no
  pierde la posición de scroll ni la selección al alternar).
- **Verificación en vivo pendiente** del descarte de notas vacías: crear
  una nota nueva y volver atrás sin escribir nada — no debe quedar en
  la lista, **ni siquiera brevemente** (el bug de la primera versión,
  reportado por el usuario: "en ocasiones alcanzo a verla por casi un
  segundo antes de que se borre", ya corregido con `beforeRemove`, ver
  arriba); abrir una nota existente con contenido, borrar todo el
  título y el contenido, volver atrás — también debe desaparecer sin
  parpadeo; escribir en una nota normal y volver atrás casi de
  inmediato (dentro de los 600ms del debounce) — el contenido SÍ debe
  quedar guardado (flush síncrono, no debe perderse); confirmar que
  volver atrás desde una nota normal (con contenido, ya guardada) se
  siente igual de instantáneo que antes, sin ningún retraso agregado
  por el listener `beforeRemove`.
