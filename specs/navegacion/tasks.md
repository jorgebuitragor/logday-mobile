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

Los tabs se ven sin ícono (cuadro vacío) — `Tabs.Screen` no define
`tabBarIcon` todavía. No afecta la función, pero hace falta agregar
íconos (ej. `@expo/vector-icons`, ya viene con Expo) en algún momento
antes de considerar esto terminado visualmente.
