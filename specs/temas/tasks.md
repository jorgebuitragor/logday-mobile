# Temas — Tareas

Estado: implementado, pendiente de confirmación en vivo.

- [x] Decidir alcance: **dark + light**, siguiendo el SO.
      Satisface: "Alcance de temas (MVP)" en `requirements.md`.
- [x] `src/theme/tokens.ts` — tokens `dark`/`light`, valores copiados
      de `task-manager/src/App.css`.
- [x] `src/theme/ThemeContext.tsx` — `ThemeProvider` + `useTheme()`,
      basado en `useColorScheme()`.
- [x] Selector manual (Sistema/Claro/Oscuro) + persistencia en
      AsyncStorage, expuesto vía `useThemePreference()` y consumido en
      el tab de Ajustes. Ver "Selector manual y persistencia" en
      `design.md`.
- [x] Migrar `app/_layout.tsx`, `app/(tabs)/_layout.tsx`,
      `app/(tabs)/index.tsx`, `app/task/new.tsx`, `app/task/[id].tsx`,
      `src/components/TaskForm.tsx`, `src/components/EntityCountScreen.tsx`
      a los tokens del tema activo.
      Satisface: "Aplicación" en `requirements.md`.
- [x] `npx tsc --noEmit` sin errores.
- [ ] Verificar en vivo en el dispositivo Android del usuario: la app
      se ve con la paleta de Logday (no colores default de RN), y
      cambia entre dark/light si el usuario cambia el tema del SO.
