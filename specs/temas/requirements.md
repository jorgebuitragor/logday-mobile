# Temas — Requirements

Estado: en diseño.

## Contexto

Hasta ahora todas las pantallas de `logday-mobile` (tabs, formulario
de Task) usaban colores hardcodeados de RN por defecto — ningún
componente vive en el sistema de diseño real de Logday. El usuario
pidió explícitamente (2026-08-29) que de acá en adelante el diseño
respete el sistema visual ya establecido en `task-manager`
(desktop, fuente de verdad) y portado en `logday-web`.

## Requisitos (EARS)

### Tokens

- El sistema DEBERÁ definir los mismos tokens de color que
  `task-manager/src/App.css`/`logday-web/src/index.css`, adaptados a
  objetos JS (React Native no tiene variables CSS):
  `bgBase`, `bgPanel`, `bgSurface`, `bgHover`, `bgElevated`, `bgInput`,
  `border`, `borderCard`, `borderHigh`, `textPrimary`, `textBody`,
  `textSecondary`, `textTertiary`, `textMuted`, `textHint`,
  `textFaint`, `accent`, `accentStrong`, `accentSoft`, `accentInk`.
- Los valores hex de cada token DEBERÁN copiarse literalmente de
  `task-manager/src/App.css` (`:root` para dark, `:root[data-theme="light"]`
  para light) — no reinventarse.

### Alcance de temas (MVP)

- El sistema DEBERÁ soportar **dark** y **light** — decidido con el
  usuario 2026-08-29. Los otros 5 temas de desktop
  (`high-contrast`/`visual-rest`/`sepia`/`oled`/`nordic`) quedan fuera
  de este MVP, no se portan todavía.
- El sistema DEBERÁ seguir el tema del sistema operativo por defecto
  (`useColorScheme` de React Native).
- El sistema DEBERÁ permitir al usuario elegir explícitamente
  Sistema/Claro/Oscuro desde el tab de Ajustes, y recordar esa
  elección entre sesiones (agregado 2026-08-29, tras el tab de
  Ajustes — ver `pantalla-ajustes/`).

### Aplicación

- Todo componente nuevo o modificado DEBERÁ leer colores del tema
  activo (vía el contexto/hook de tema), nunca un valor hex
  hardcodeado.
- Las pantallas ya existentes antes de este spec (tabs, lista/
  formulario de Task) DEBERÁN migrarse a los tokens en el mismo
  cambio que introduce el sistema de temas — no quedan a medio migrar.

## Fuera de este spec

- Los 5 temas adicionales de desktop.
- Temas personalizados (`CustomTheme`, derivación HSL) — existen en
  desktop/web, no se portan a mobile en este spec.
