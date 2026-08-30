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

## Los 5 temas adicionales + logo + header nativo (agregado 2026-08-30)

- [x] `src/theme/tokens.ts`: `highContrast`/`visualRest`/`sepia`/
      `oled`/`nordic`, valores copiados de `task-manager/src/App.css`.
- [x] `src/theme/ThemeContext.tsx`: `ThemePreference` ampliado a los 8
      valores; `TOKENS_BY_THEME`/`SCHEME_BY_THEME` (lookup por tema,
      reemplaza el `if` binario anterior); `VALID_PREFERENCES` para
      la validación de lo leído de `AsyncStorage`.
- [x] `app/(tabs)/settings.tsx`: `THEME_PREFERENCES` con los 8;
      `THEME_ICONS`/`THEME_LABEL_KEY`/`THEME_DESC_KEY` (mapas
      explícitos, ya no se deriva la clave i18n dinámicamente);
      `OptionRow` gana `description` opcional — mismo patrón visual
      que `ThemeRow` de logday-web (ícono+etiqueta+descripción+check).
- [x] `src/components/LogoMark.tsx` (nuevo): SVG inline con
      `theme.accent`, puerto del ícono del sidebar de desktop.
      `assets/logo-mark.png` eliminado (sin más referencias).
- [x] `app/(tabs)/_layout.tsx`/`app/_layout.tsx`: `headerLeft` usa
      `<LogoMark>`; `headerShadowVisible: false` +
      `headerTitleStyle` en ambos; borde inferior explícito solo en
      `Tabs` (`Stack`/native-stack no soporta bordes en `headerStyle`,
      ver design.md).
- [x] i18n: `settings.theme{HighContrast,VisualRest,Sepia,Oled,Nordic}`
      + `*Desc` para los 8 (incluye las 3 que ya existían, no tenían
      descripción todavía). Paridad verificada (252 = 252).
- [x] `./node_modules/.bin/tsc --noEmit` sin errores.
- [x] Bundle de Metro pedido directo, sin errores de resolución
      (`LogoMark`/`highContrast`/`visualRest`/`nordic`/
      `TriangleAlert` aparecen resueltos).
- [ ] Verificar en vivo: los 5 temas nuevos se ven completos y
      coherentes; el logo cambia de color con el tema; la sección
      "Tema" de Ajustes con las 8 filas; la sombra del header nativo
      desapareció en los 5 tabs y en las pantallas modales.
