# Navegación — Tareas

Estado: implementado y verificado en vivo.

- [x] Decidir librería de navegación: **Expo Router**.
      Satisface: "Librería y estructura" en `requirements.md`.
- [x] Decidir estructura de primer nivel: **tabs inferiores**.
      Satisface: "Librería y estructura" en `requirements.md`.
- [x] Instalar `expo-router` y dependencias asociadas
      (`react-native-safe-area-context`, `react-native-screens`,
      `expo-linking`, `expo-constants`), `package.json` actualizado
      (`main: expo-router/entry`), plugin `expo-router` agregado en
      `app.json` automáticamente por `npx expo install`.
- [x] Crear `app/_layout.tsx` (inicializa `initDb()`, muestra loading/
      error mientras tanto) y `app/(tabs)/_layout.tsx` (tab bar con
      los 4 tabs).
- [x] Crear las 4 pantallas de tab (`index.tsx`, `notes.tsx`,
      `dailys.tsx`, `overtime.tsx`), cada una usando el componente
      compartido `src/components/EntityCountScreen.tsx` que hace
      `SELECT COUNT(*)` real contra su tabla vía `countRows()`
      (nuevo helper en `src/db/index.ts`).
      Satisface: "Alcance de esta fase" en `requirements.md`.
- [x] Eliminar `App.tsx`/`index.ts` del scaffold anterior.
- [x] `npx tsc --noEmit` sin errores.
- [x] Verificar en vivo en el dispositivo Android del usuario: los 4
      tabs navegan y cada uno muestra su conteo (0 al inicio, DB
      vacía). Confirmado 2026-08-29 — tab "Tasks" carga con "0
      registros locales".

## Pendiente cosmético (no bloqueante)

~~Los tabs se ven sin ícono~~ — resuelto tiempo después, cada
`Tabs.Screen` en `app/(tabs)/_layout.tsx` ya define `tabBarIcon` con
`lucide-react-native`.

## Transiciones (agregado 2026-08-30)

Pedido directo del usuario: "Puedes añadir animaciones al cambiar de
pantallas. Muy sutiles, pero notorias. Además se ve un detalle blanco
al entrar en pantallas de detalles para extras, notas, Dailys, etc."

- [x] `app/(tabs)/_layout.tsx`: `screenOptions.animation = 'fade'` —
      cross-fade sutil al cambiar de tab (antes instantáneo, sin
      animación).
- [x] `npx expo install expo-system-ui` — agregado a `package.json`
      (`~57.0.3`), sin necesitar development build nuevo (incluido en
      el set de módulos de Expo Go para esta versión de SDK).
- [x] `src/theme/ThemeContext.tsx`: `SystemUI.setBackgroundColorAsync(tokens.bgBase)`
      en un `useEffect` dentro de `ThemeProvider`, disparado cada vez
      que cambia `tokens.bgBase` — sincroniza la ventana nativa raíz
      con el tema activo, eliminando el destello blanco al entrar a
      cualquier pantalla modal (causa raíz: la ventana nativa tiene
      fondo blanco por defecto y se asoma un frame durante las
      transiciones nativas, fuera del control de `contentStyle`). Ver
      design.md.
- [x] `./node_modules/.bin/tsc --noEmit` sin errores.
- [x] Bundle de Metro pedido directo, sin errores de resolución
      reales; `setBackgroundColorAsync`/`expo-system-ui` aparecen
      resueltos en el bundle.
- [ ] Verificar en vivo: cambiar de tab repetidamente y confirmar que
      el fade se ve fluido; entrar a cada pantalla modal (task/note/
      daily/overtime, nuevo y edición) en al menos un tema oscuro y
      uno claro, confirmando que no aparece ningún destello blanco;
      cambiar de tema desde Ajustes y confirmar que la siguiente
      navegación ya refleja el fondo nuevo.
