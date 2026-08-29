# Pantalla de Notes — Design

Estado: implementado — ver `src/db/notes.ts`, `app/(tabs)/notes.tsx`,
`app/note/new.tsx`, `app/note/[id].tsx`, `src/lib/noteMarkdown.ts`.

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

## Editor de texto enriquecido (agregado 2026-08-29)

Desktop no edita markdown a mano — `NoteEditor.tsx` usa TipTap 3 (sobre
ProseMirror), un editor WYSIWYG real con una barra de formato que llama
comandos del editor directamente (`editor.chain().focus().toggleBold().run()`,
etc.), y solo serializa a markdown (`tiptap-markdown`) para guardar.
TipTap es una librería de DOM/`contentEditable` — no corre nativo en
React Native.

**Decisión** (presentada al usuario con los dos caminos reales, ver
`pantalla-notes/requirements.md`): usar `@10play/tentap-editor` — TipTap
corriendo dentro de un `WebView` (`react-native-webview`), con un
puente JS↔RN. Se investigó la alternativa liviana (barra de botones
que envuelve la selección con `**negrita**`/`` `código` ``/`# cabecera`
sobre un `TextInput` plano — cero dependencia pesada, cero riesgo) y
se le explicó al usuario el riesgo real de la opción WYSIWYG (dos
issues abiertos y sin resolver en GitHub sobre Android: el teclado que
a veces no aparece, y el editor que a veces nunca termina de
inicializar en ciertos teléfonos) — el usuario prefirió igual el
WYSIWYG real y aceptó verificarlo en vivo en su dispositivo como
primer paso, antes de invertir en el resto de la feature (menú
contextual, exportación).

**markdown ⇄ HTML sin bridge extension custom** — `tentap-editor` no
habla markdown de forma nativa (solo `getHTML()`/`getJSON()`/
`getText()`); el mantenedor sugiere escribir una bridge extension
propia envolviendo `tiptap-markdown` para eso, pero eso cae en su
"advanced setup", que probablemente exige salir de Expo Go a un dev
client — justo lo que se quería evitar. En cambio, la conversión se
hace en JS plano, fuera del editor, en el borde de guardado/carga:
`src/lib/noteMarkdown.ts` — `markdownToHtml()` (usa `markdown-it`) al
cargar la nota (`editor.setContent(...)`, una vez que
`useBridgeState(editor).isReady` es `true`) y `htmlToMarkdown()` (usa
`turndown`) al guardar (tras `await editor.getHTML()`). Esto mantiene
`tentap-editor` en su modo "basic usage" (confirmado compatible con
Expo Go), a costa de perder fidelidad en ida y vuelta para markdown
"exótico" que `turndown`/`markdown-it` no reproduzcan igual — riesgo
aceptado, no verificado a fondo todavía con notas reales que vinieron
de desktop.

**Toolbar y tema**: se usa `<Toolbar editor={editor} />` con el set de
ítems por defecto de la librería (`DEFAULT_TOOLBAR_ITEMS` — negrita,
cursiva, tachado, subrayado, código en línea, cabeceras H1-H6 (vía
submenú), listas con viñetas/numeradas, checklist, cita, enlace),
sin curar todavía a un subconjunto más pequeño — pendiente de ver en
vivo si se siente "abrumador" también. El tema del editor y de la
toolbar (colores de fondo/ícono/estado activo) se mapean desde
`ThemeTokens` en `buildEditorTheme()` (`app/note/[id].tsx`) usando la
opción `theme` de `useEditorBridge` (tipo `RecursivePartial<EditorTheme>`
de la propia librería) — no hay CSS inyectado a mano todavía para el
contenido HTML dentro del WebView (tipografía/colores del *cuerpo* del
documento), solo el fondo del WebView y la toolbar quedan temados;
pendiente de revisar en vivo si el texto se ve legible en modo oscuro.

## Explícitamente pendiente

- Picker/autocompletado de `folder` a partir de carpetas existentes
  (en el modal de carpeta, no en el filtro — ese ya existe, ver
  arriba).
- Menú de más acciones (renombrar, duplicar, copiar, exportar, abrir
  en el sistema) — cubierto por `menu-contextual-notas/` (spec
  separado, en progreso).
- Exportación (Markdown/TXT/PDF, como desktop) — cubierto por
  `exportacion/` (spec separado, en progreso).
- **Verificación en vivo pendiente** (crítico, no cosmético): esta es
  la primera vez que se prueba `tentap-editor` en el dispositivo real
  del usuario — hay dos issues abiertos en GitHub específicos de
  Android (teclado que no aparece, editor que nunca inicializa) sin
  workaround confirmado. Si aparecen en este dispositivo, la decisión
  tomada arriba (WYSIWYG real vs. toolbar de markdown liviana) se
  revisita con el usuario, no se fuerza un parche silencioso.
- Curar `DEFAULT_TOOLBAR_ITEMS` a un subconjunto más pequeño si el
  usuario lo siente "abrumador" también (mismo motivo que llevó a
  simplificar el resto de esta pantalla).
- CSS de tema para el *contenido* dentro del WebView (tipografía,
  color de texto del cuerpo del documento en modo oscuro) — hoy solo
  el fondo del WebView y la toolbar están temados.
