# Splash — Tareas

Estado: implementado; el splash nativo, pendiente del build propio.

- [x] `expo-splash-screen` y `@expo-google-fonts/jetbrains-mono`
      (`npx expo install`, versiones del SDK 57); plugin en `app.json`
      con `assets/splash-mark.png`.
- [x] `BootSplash` con la animación y `useReducedMotion`.
- [x] `useThemeReady` en `ThemeContext`; formas del logo compartidas
      desde `LogoMark`.
- [x] Arranque en `app/_layout.tsx`: retener el nativo, fuente, tema,
      splash encima de la app y protección de 3 s.
- [x] Probado en Expo Go (12 nov 2026), con la animación 6 veces más
      lenta solo para poder capturar cuadros (no se commiteó):
      - iOS (iPhone 17): los 8 temas, y "Sistema" en modo claro y en
        oscuro;
      - Android (Pixel 8, Android 16): Sistema y Sepia.
      El ícono, el wordmark y los colores cambian con cada tema, la línea
      se dibuja y el splash se desvanece sobre el Inicio.
- [ ] Con "reducir movimiento" activado: que no anime.
- [x] APK preview en el teléfono de Jorge (17 nov 2026): el nativo con
      el logo solo duraba más que la animación, que pasaba muy rápido.
- [x] Splash nativo sin ícono (`assets/splash-blank.png`), animación de
      1,2 s y fuente embebida con el plugin `expo-font`.
- [ ] En un APK nuevo: que el nativo se vea solo con el fondo, en claro
      y en oscuro, y que el paso a la animación no tenga saltos.
