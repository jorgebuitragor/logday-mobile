# Búsqueda global — Design

Estado: implementado — ver `src/db/search.ts`, `app/search.tsx`.

## `searchAll(query)`

4 queries `LIKE '%query%'` independientes (una por tabla), sin FTS5 ni
índices especiales — no hay evidencia de que el volumen de datos de un
solo usuario en un dispositivo lo justifique todavía. `snippetFrom()`
recorta el texto alrededor de la primera coincidencia (±20/100
caracteres) para dar contexto sin mostrar el contenido completo.
`RESULT_LIMIT = 10` por grupo.

## `app/search.tsx`

Ruta modal (registrada en `app/_layout.tsx`), no un modal superpuesto
sobre la pantalla actual — mismo patrón `presentation: 'modal'` que
`task/new`, etc., más simple de razonar en Expo Router que un modal
JS propio. Debounce de 200ms sobre el input antes de disparar
`searchAll` (evita una query por tecla). Al tocar un resultado, hace
`router.back()` (cierra la búsqueda) y luego `router.push()` a la
pantalla correspondiente — en ese orden, para que el usuario vea la
navegación normal (no la búsqueda apilada debajo).

Ícono de acceso: `headerRight` en `app/(tabs)/_layout.tsx`
(`screenOptions`, visible en los 5 tabs), ícono `Search` de
`lucide-react-native` — no hay un ícono equivalente en desktop para
esto (ahí es un atajo de teclado, `Cmd+F`/`Ctrl+F`), así que el ícono
es una decisión de diseño propia de mobile, no un port.

## Bug de contraste en el input (corregido 2026-08-29)

El texto escrito no se distinguía del fondo. Causa: el color/fondo se
aplicaban al `View` contenedor (`inputWrap`), no al `TextInput` en sí
— en Android, un `TextInput` sin `backgroundColor` propio puede
heredar/mostrar el fondo por defecto del widget nativo en vez del de
su contenedor, tapando el texto según el tema activo. Corregido
aplicando `borderColor`/`backgroundColor`/`color` directo al
`TextInput` (mismo patrón que ya usan `TaskForm`/`NoteForm`/
`OvertimeForm`, que nunca tuvieron este problema por eso mismo), más
`selectionColor={theme.accent}`.

## Explícitamente pendiente

Ver "Fuera de este spec" en `requirements.md`.
