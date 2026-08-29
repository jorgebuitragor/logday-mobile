# Branding — Requirements

Estado: implementado.

## Contexto

El usuario notó, tras probar tema+i18n en vivo, que no había logo de
Logday en ningún lado ni íconos en el tab bar — el scaffold traía los
assets genéricos de `create-expo-app`. Igual que `temas/`/`i18n/`,
esto se resuelve con la marca ya existente en el ecosistema
(`task-manager`/`logday-web`), no inventando una nueva.

## Requisitos (EARS)

- El ícono de la app (home screen, iOS y Android) DEBERÁ ser la marca
  de Logday (`task-manager/icon_square.png`), no el ícono genérico de
  Expo.
- El ícono adaptativo de Android DEBERÁ usar el glyph de Logday sin
  fondo (`task-manager/icon_square_wiout_background.png`) como
  foreground, sobre un fondo sólido del color de acento de marca
  (`#6366f1`).
- Cada tab DEBERÁ mostrar un ícono — mismos íconos que usa el sidebar
  de `task-manager` para las mismas secciones (`lucide-react` en
  desktop, `lucide-react-native` acá: mismo set de íconos, misma
  librería visual, solo el paquete cambia por la plataforma).
- El header de cada tab DEBERÁ mostrar el logo de Logday (glyph sin
  fondo) — mismo criterio que desktop/web, que lo muestran en los
  headers con los que se navega la app ya autenticada.

## Fuera de este spec

- Pantalla de login/splash con branding propio — no existe todavía
  auth en mobile.
- Ícono monocromático de Android 13+ ajustado a mano (se generó
  automáticamente desde el glyph, sin revisión visual fina).
