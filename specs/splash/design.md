# Splash — Design

## Dos etapas

1. **Splash nativo** (`expo-splash-screen`, plugin en `app.json`): solo
   el fondo, `#f4f4f5` (tema claro) o `#121212` (oscuro). El plugin
   exige una imagen (en Android es el `windowSplashScreenAnimatedIcon`),
   así que lleva `assets/splash-blank.png`, un PNG transparente. Así el
   logo aparece una sola vez, en la animación, que arranca desde el
   fondo vacío sin saltos. Solo se ve en un build propio.
2. **`BootSplash`** (`src/components/BootSplash.tsx`): el splash de la
   app, con los colores del tema activo. Reemplaza al texto
   "Inicializando DB…".

## Orden de arranque (`app/_layout.tsx`)

- `SplashScreen.preventAutoHideAsync()` al cargar el módulo: el nativo
  se queda mientras se leen el tema guardado (`useThemeReady`, nuevo en
  `ThemeContext`) y la fuente (`useFonts` con `JetBrainsMono_600SemiBold`
  de `@expo-google-fonts/jetbrains-mono`). En un build propio la fuente
  va embebida (plugin `expo-font` en `app.json`, mismo nombre de
  familia), así que `useFonts` la da por cargada desde el primer render;
  en Expo Go se descarga como antes. Mientras tanto, el layout
  devuelve `null`. Si pasan 3 s sin tema o sin fuente, se sigue igual,
  para no dejar el nativo trabado.
- `BootSplash` oculta el nativo en su primer `onLayout`.
- `BootSplash` va siempre en la misma posición del árbol (con `key`),
  para que no se vuelva a montar cuando la base termina de abrir. La app
  (`Stack` y compañía) se monta debajo en cuanto la base está lista, y
  el splash se desvanece encima. `onHidden` lo desmonta.
- `SplashScreen.setOptions` (fundido de 150 ms) solo fuera de Expo Go,
  que no lo permite.

## Animación (Reanimated 4)

- Ícono: opacidad de 0 a 1 y escala de 0,9 a 1, en 520 ms.
- Línea de tendencia: `strokeDashoffset` animado sobre `Path`
  (`createAnimatedComponent`), de 340 a 1040 ms. Las formas del logo se
  comparten con `LogoMark` (`LOGO_*_PATH`).
- Wordmark: opacidad y desplazamiento de 10 px hacia arriba, de 560 a
  1080 ms.
- Salida: opacidad del contenedor a 0 en 280 ms, no antes del fin de la
  entrada (1,2 s desde que se monta).
- Hasta el 17 nov 2026 duraba 0,7 s (salida de 220 ms); en el teléfono
  pasaba tan rápido que casi no se veía.
- `useReducedMotion()`: todo arranca completo y se quita sin fundido.

## Alternativas descartadas

- **Splash nativo con el logo y la animación arrancando desde ese logo:**
  seguía la espera con el logo solo, que es lo que no le gustó a Jorge.

- **Un video o Lottie:** suma una dependencia y un archivo por tema. Con
  SVG y Reanimated el logo toma el acento de cada tema.
- **Un splash nativo por tema:** el sistema solo admite claro y oscuro.
- **Retrasar la app hasta el fin de la animación:** se monta debajo en
  paralelo, así que la animación no suma tiempo de carga real.

## Notas de la prueba

- En Expo Go, en Android, aparece a veces el aviso de React "Can't
  perform a React state update on a component that hasn't mounted yet"
  sobre `ContextNavigator` de Expo Router: 1 de 4 arranques, solo en el
  primero después de que Metro sirve un bundle nuevo (Expo Go descarga
  la actualización y recarga). En `develop` no apareció en 2 arranques.
  Es un aviso de desarrollo; revisar en el build propio.
