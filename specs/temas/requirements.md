# Temas — Requirements

Estado: implementado, pendiente de confirmación en vivo.

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

### Alcance de temas (ampliado 2026-08-30)

Revierte la reducción de alcance original de esta sección — pedido
explícito del usuario: "incluye los temas que faltan en la app.
Seleccionable desde el apartado de opciones, similar a como se hace
en Logday-web".

- El sistema DEBERÁ soportar los 8 temas fijos de desktop/logday-web:
  **system**, **light**, **dark**, **high-contrast**, **visual-rest**,
  **sepia**, **oled**, **nordic** — mismos valores hex que
  `task-manager/src/App.css`, copiados literales (ver design.md).
- El sistema DEBERÁ seguir el tema del sistema operativo por defecto
  (`useColorScheme` de React Native) cuando la preferencia es
  **system** — igual que antes, "system" nunca resuelve a uno de los
  5 temas especiales, solo alterna entre claro/oscuro simple (mismo
  criterio que desktop/logday-web).
- El sistema DEBERÁ permitir al usuario elegir explícitamente
  cualquiera de los 8 desde el tab de Ajustes, con el mismo patrón
  visual que `SettingsSection.tsx` de logday-web (fila con
  ícono+etiqueta+descripción+indicador de selección, no una grilla —
  logday-web ya documenta por qué: "en mobile una grilla de 3 columnas
  deja cada opción muy chica para tocar"), y recordar esa elección
  entre sesiones (ya existía para Sistema/Claro/Oscuro, ahora
  extendido a los 8).

### Aplicación

- Todo componente nuevo o modificado DEBERÁ leer colores del tema
  activo (vía el contexto/hook de tema), nunca un valor hex
  hardcodeado.
- Las pantallas ya existentes antes de este spec (tabs, lista/
  formulario de Task) DEBERÁN migrarse a los tokens en el mismo
  cambio que introduce el sistema de temas — no quedan a medio migrar.

### Logo adaptable al tema (agregado 2026-08-30)

Pedido explícito del usuario tras notar que el logo del header no se
veía bien: "Mira como lo está trabajando desktop el logo de Logday
adaptable a temas."

- El logo mostrado en el header de la app DEBERÁ adaptarse al tema
  activo (color de acento) automáticamente, incluidos los 8 temas de
  esta sección — no una imagen estática con colores fijos.

## Fuera de este spec

- Temas personalizados (`CustomTheme`: acento/tinte/intensidad
  elegidos por el usuario, con su propio editor) — existen en
  desktop/web, no se portan a mobile en este checkpoint. El pedido del
  usuario nombró específicamente "los temas que faltan" (los 8 fijos),
  no el constructor de temas personalizados.
