# Pantalla de Notes — Tareas

Estado: implementado y verificado en vivo (CRUD base); paridad
pinned/folder/tags verificada en vivo; editor simplificado agregado
2026-08-29 (título+contenido primario, carpeta/tags/pin secundarios);
el editor WYSIWYG se implementó, se probó en vivo y se **revirtió** el
mismo día por bugs reportados por el usuario, reemplazado por una
toolbar de markdown sobre `TextInput` — pendiente de verificación en
vivo de esta versión revertida (ver abajo).

- [x] `src/db/notes.ts` (`listNotes`, `getNote`, `createNote`,
      `updateNote`, `softDeleteNote`).
- [x] `app/(tabs)/notes.tsx` — lista real con preview de contenido.
- [x] `app/note/new.tsx` / `app/note/[id].tsx`.
- [x] Registrar rutas `note/new` y `note/[id]` en `app/_layout.tsx`.
- [x] `npx tsc --noEmit` sin errores.
- [x] Verificar en vivo: crear, editar y eliminar una nota desde el
      dispositivo Android del usuario. Confirmado 2026-08-29.

## Paridad pinned/folder/tags (agregado 2026-08-29)

- [x] `src/db/notes.ts`: `setNotePinned`, `NoteInput.folder`/`.tags`,
      `createNote`/`updateNote` persisten `folder`/`tags`,
      `listNotes()` ordena `pinned DESC, updated DESC`.
- [x] `app/(tabs)/notes.tsx`: fila muestra indicador de pin (ícono,
      no interactivo), `folder` y `tags`.
- [x] i18n: nuevas claves en `noteForm`/`noteList` de `es.json`/`en.json`
      (`folder`, `folderPlaceholder`, `tags`, `tagPlaceholder`,
      `addTag`, `removeTag`, `pin`, `unpin`, `pinnedLabel`).
- [x] `npx tsc --noEmit` sin errores.
- [x] Verificar en vivo: anclar/desanclar una nota, asignarle carpeta y
      tags, y confirmar que la fila y el orden de la lista reflejan lo
      esperado. Confirmado 2026-08-29.

## Editor simplificado (agregado 2026-08-29)

A pedido del usuario ("el editor de notas más simple... solo título y
texto"). Ver design.md ("Editor simplificado") para el razonamiento
completo.

- [x] `app/note/new.tsx` reescrito: crea la nota vacía de inmediato y
      navega a `/note/<id>` (`router.replace`) — ya no muestra ningún
      formulario.
- [x] `app/note/[id].tsx` reescrito: título (`TextInput` multilínea) +
      contenido como cuerpo principal; barra de herramientas con
      destacar/carpeta/tags/eliminar; autosave debounced (600ms,
      título+contenido) + autosave inmediato (carpeta/tags/destacado);
      modales propios para carpeta y tags (reemplazan los campos que
      tenía `NoteForm`).
- [x] `src/components/NoteForm.tsx` eliminado (sin uso restante).
- [x] i18n: `noteForm.content`/`createSubmit`/`editSubmit`/`newTitle`
      retirados (ya no aplican); agregadas `folderModalTitle`,
      `folderSave`, `tagsModalTitle`, `tagsDone`, `folderButton`,
      `tagsButton`; `editTitle` redactado de nuevo (ya no menciona
      "formulario").
- [x] `npx tsc --noEmit` sin errores.

## Editor WYSIWYG — implementado, probado en vivo, revertido (2026-08-29)

Ver design.md, "Formato de texto — historial y reversión", para el
detalle completo. Resumen: se implementó `@10play/tentap-editor`
(TipTap sobre WebView) tras advertirle al usuario el riesgo real
(issues de Android sin resolver); al probarlo en vivo el usuario
confirmó "muchos bugs" y pidió revertir a la toolbar de markdown que
se le había recomendado originalmente.

- [x] Instalado y luego desinstalado por completo: `@10play/tentap-editor`,
      `react-native-webview`, `markdown-it`, `turndown` (+ `@types/*`).
- [x] `src/lib/noteMarkdown.ts` creado y luego eliminado (ya no hace
      falta ninguna conversión markdown ⇄ HTML).
- [x] `app/note/[id].tsx` reescrito de vuelta a `TextInput` de texto
      plano.

## Toolbar de markdown (agregado 2026-08-29, reemplaza el intento WYSIWYG)

- [x] `src/components/MarkdownToolbar.tsx` (nuevo): 9 botones
      (negrita, cursiva, código, H1, H2, lista con viñetas, lista
      numerada, cita, enlace) sobre `content`/`selection` controlados
      en `app/note/[id].tsx` (`onSelectionChange` + prop `selection`).
- [x] `app/note/[id].tsx`: `content` vuelve a ser un `TextInput`
      multilínea plano; se agrega estado `selection` y
      `handleToolbarChange` (aplica el cambio de la toolbar por el
      mismo camino de autosave que tipear a mano).
- [x] i18n: agregadas `noteForm.formatBold`/`formatItalic`/`formatCode`/
      `formatH1`/`formatH2`/`formatBulletList`/`formatOrderedList`/
      `formatQuote`/`formatLink` (accessibility labels de los botones);
      `contentPlaceholder` vuelve a mencionar markdown. Paridad de
      claves es/en verificada (163 = 163).
- [x] `npx tsc --noEmit` sin errores.
- [x] Dev server reiniciado con caché limpia (`expo start -c`,
      obligatorio: se removió `react-native-webview`, un módulo
      nativo).
- [x] Verificar en vivo: la toolbar apareció, pero el usuario reportó
      3 problemas — "muy abajo y muy pequeña", tapada por el teclado,
      y molestando con los gestos de navegación de Android. Corregido
      el mismo día, ver abajo.

## Safe area y teclado (agregado 2026-08-29)

Ver design.md, "Safe area y teclado", para el diagnóstico completo:
`SafeAreaProvider` no estaba montado en ningún lado de la app (cero
usos de `useSafeAreaInsets`/`SafeAreaView` en todo el código), y esta
pantalla no manejaba el teclado en absoluto.

- [x] `app/_layout.tsx`: agregado `SafeAreaProvider` (envolviendo todo
      dentro de `GestureHandlerRootView`) — primera vez que se monta
      en la app.
- [x] `src/components/MarkdownToolbar.tsx`: `useSafeAreaInsets().bottom`
      como `paddingBottom` (mínimo 8px); íconos `18→22`; botones
      pasan de `padding:8` fijo a `flex:1` para ocupar todo el ancho.
- [x] `app/note/[id].tsx`: título + contenido + toolbar envueltos en
      `KeyboardAvoidingView` (`behavior: 'padding'` iOS / `'height'`
      Android) — nuevo `styles.body`.
- [x] `npx tsc --noEmit` sin errores. No hizo falta reinstalar
      dependencias (`react-native-safe-area-context` ya estaba en
      package.json como transitiva) ni reiniciar el dev server con
      caché limpia (sin paquete nuevo).
- [x] Verificar en vivo: el tamaño/ancho de la toolbar y la zona de
      gestos quedaron bien, pero el usuario mandó una captura
      mostrando el teclado tapando la toolbar por completo —
      `KeyboardAvoidingView` no resolvió el problema en este
      dispositivo. Corregido el mismo día, ver abajo.

## Safe area y teclado (v2) — corrige `KeyboardAvoidingView` (agregado 2026-08-29)

Ver design.md, "Safe area y teclado (v2)": `KeyboardAvoidingView`
depende del módulo `Keyboard` clásico de RN, que no es confiable bajo
edge-to-edge en Android — problema conocido del ecosistema, no
específico de esta pantalla.

- [x] `app/note/[id].tsx`: reemplazado `KeyboardAvoidingView` por
      `useAnimatedKeyboard()` (Reanimated, ya instalado) +
      `Animated.View` con `paddingBottom` animado igual a
      `keyboard.height.value` — lee el inset nativo del teclado
      directo en vez de eventos JS legacy. Opciones
      `isStatusBarTranslucentAndroid`/`isNavigationBarTranslucentAndroid`
      en `true` (esta app ya es edge-to-edge).
- [x] `npx tsc --noEmit` sin errores. Sin dependencias nuevas
      (Reanimated ya estaba instalado) — no hizo falta reiniciar el
      dev server con caché limpia.
- [ ] Verificar en vivo: la toolbar de markdown queda visible arriba
      del teclado al escribir en el contenido, sin quedar tapada.

## Vista previa (agregado 2026-08-29)

Pedido del usuario ("podemos añadir vista previa del .md?") tras
revertir el editor WYSIWYG. Ver design.md, "Vista previa".

- [x] Instalado `react-native-markdown-display` (renderiza con
      `Text`/`View` nativos, sin WebView — no repite el riesgo de
      `tentap-editor`).
- [x] `app/note/[id].tsx`: botón `Eye`/`EyeOff` en la barra superior
      (`previewMode`, junto a destacar/carpeta/tags); en preview
      muestra `<Markdown>{content}</Markdown>` dentro de un
      `ScrollView` (con mensaje si está vacío) en vez de
      `TextInput`+`MarkdownToolbar`; el título queda fuera del toggle,
      siempre editable. `buildMarkdownStyle(theme)` mapea
      `ThemeTokens` a las claves de estilo de la librería.
- [x] i18n: agregadas `noteForm.previewToggle`/`previewEmpty`. Paridad
      de claves es/en verificada (165 = 165).
- [x] `npx tsc --noEmit` sin errores.
- [x] Dev server reiniciado con caché limpia (`expo start -c`,
      paquete nuevo).
- [x] Auditoría: `npm install` reportó una vulnerabilidad "high" en
      `linkify-it` (ReDoS, sin fix), arrastrada por `markdown-it` vía
      esta librería — riesgo aceptado y documentado en design.md (sin
      superficie de ataque real hoy: contenido siempre local, sin
      sync todavía).
- [ ] Verificar en vivo: el toggle cambia de modo sin perder el
      contenido; el markdown renderiza legible en modo oscuro y modo
      claro (títulos, negrita, cursiva, código, listas, citas,
      enlaces); una nota vacía en preview muestra el mensaje, no un
      área en blanco.

## Indicador de guardado (agregado 2026-08-30)

- [x] `app/note/[id].tsx`: `saveState` (`'idle'|'pending'|'saved'`),
      actualizado en `scheduleSave`/`flushSave`/`persistNow`; texto
      "Guardando…"/"Guardado" en el espacio antes vacío de la barra
      superior.
- [x] i18n: `noteForm.saving`/`saved` en es/en. Paridad verificada
      (254 = 254).
- [x] `./node_modules/.bin/tsc --noEmit` sin errores.
- [x] Bundle de Metro pedido directo, HTTP 200.
- [ ] Verificar en vivo (reportado con captura por el usuario):
      escribir en una nota muestra "Guardando…" y después "Guardado"
      sin tener que volver al listado para confirmarlo.
