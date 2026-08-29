# Confirmación antes de eliminar — Design

Estado: implementado — ver `src/settings/PreferencesContext.tsx`,
`src/hooks/useConfirmDelete.ts`, `src/components/ConfirmDeleteModal.tsx`.

## `PreferencesContext`

Mismo patrón que `ThemeContext`/`i18n` (Context + AsyncStorage,
`confirmDestructiveActions` persistida bajo esa misma clave, default
`true`). Se agregó como provider nuevo en `app/_layout.tsx` (junto a
`ThemeProvider`), no se sobrecargó `ThemeContext` — es una preferencia
de comportamiento, no de apariencia, conceptualmente distinta.

## `useConfirmDelete<T>` — puerto exacto

Sin cambios respecto a desktop: `request(item, directAction)` decide
mostrar el modal o ejecutar directo según el booleano recibido.
`ConfirmDeleteModal` (RN, `Modal` nativo + backdrop) reemplaza el
`ModalOverlay`/`ModalPanel` de desktop — incluye solo `title`/`message`/
`cancelLabel`/`confirmLabel`/`onConfirm`/`onCancel`, sin la variante
`soft`/posicionada por coordenadas de desktop (esa variante existe
para menús contextuales de mouse, que mobile no tiene).

## Integración

Cada pantalla que elimina (`app/(tabs)/index.tsx`, `notes.tsx`,
`dailys.tsx`, `overtime.tsx` para el swipe; `app/task/[id].tsx`,
`note/[id].tsx`, `daily/[date].tsx`, `overtime/[id].tsx` para el botón
"Eliminar") instancia su propio `useConfirmDelete<T>(confirmDestructiveActions)`
y su propio `<ConfirmDeleteModal>` — no hay un modal global compartido,
porque cada pantalla tiene su propio `pending`/pending item tipado
distinto (`Task`/`Note`/`DailyEntry`/`OvertimeEntry`/`true`).

## Explícitamente pendiente

Ninguno — alcance completo con lo implementado.
