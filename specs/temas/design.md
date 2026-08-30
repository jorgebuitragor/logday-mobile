# Temas — Design

Estado: implementado — ver `src/theme/`.

## Tokens (copiados de `task-manager/src/App.css`)

`src/theme/tokens.ts` exporta `dark` y `light`, cada uno con la misma
forma:

```ts
export interface ThemeTokens {
  bgBase: string; bgPanel: string; bgSurface: string; bgHover: string;
  bgElevated: string; bgInput: string;
  border: string; borderCard: string; borderHigh: string;
  textPrimary: string; textBody: string; textSecondary: string;
  textTertiary: string; textMuted: string; textHint: string; textFaint: string;
  accent: string; accentStrong: string; accentSoft: string; accentInk: string;
}
```

Valores: copiados literal de `App.css` `:root` (dark) y
`:root[data-theme="light"]` (light). `accentSoft` en desktop es
`rgba(129, 140, 248, 0.22)` (dark) / `rgba(99, 102, 241, 0.18)`
(light) — RN acepta `rgba()` como string de color directamente, se
copia tal cual sin convertir a hex+alpha por separado.

## `ThemeContext`

`src/theme/ThemeContext.tsx`: `ThemeProvider` envuelve la app en
`app/_layout.tsx`, usa `useColorScheme()` de `react-native` (sigue el
tema del SO en vivo, sin estado propio ni persistencia — ver
`requirements.md`, sin selector manual en esta fase) y expone
`useTheme()` → `ThemeTokens` del tema activo (`dark` si
`useColorScheme()` retorna `null`/`undefined`, mismo default que
desktop).

## Migración de pantallas existentes

Todas las pantallas creadas antes de este spec dejan de usar
`StyleSheet.create` con colores literales fijos; en su lugar:

- Los estilos que no dependen del tema (padding, gap, border radius,
  layout) siguen en `StyleSheet.create` normal.
- Los colores se aplican inline leyendo `useTheme()` en el componente
  (`style={{ color: theme.textPrimary }}`), porque `StyleSheet.create`
  se evalúa una sola vez al importar el módulo y no puede reaccionar a
  cambios de tema en vivo — es el patrón estándar en RN para estilos
  dependientes de estado/contexto.

Pantallas migradas: `app/(tabs)/_layout.tsx` (tab bar), `app/(tabs)/index.tsx`
(lista de Tasks), `app/task/new.tsx`/`app/task/[id].tsx` (vía
`TaskForm`), `src/components/TaskForm.tsx`, `src/components/EntityCountScreen.tsx`,
`app/_layout.tsx` (pantallas de loading/error de la DB).

## Selector manual y persistencia (agregado 2026-08-29)

`ThemeContext` pasó de exponer solo `ThemeTokens` a un contexto
combinado (`tokens`, `preference: 'system'|'light'|'dark'`,
`setPreference`), sin romper los call-sites existentes: `useTheme()`
sigue devolviendo solo `tokens` (la mayoría de los componentes solo
necesitan colores); se agregó `useThemePreference()` aparte para el
tab de Ajustes, que es el único consumidor de `preference`/
`setPreference`.

- `preference` se persiste en `@react-native-async-storage/async-storage`
  (`themePreference`), leída de forma asíncrona al montar
  `ThemeProvider` — el primer render usa `'system'` hasta que se
  resuelve la lectura, causando un flash breve si el usuario había
  elegido explícitamente algo distinto del tema del SO. Aceptado por
  simplicidad (mismo criterio que el flash de idioma, ver
  `i18n/design.md`) — no se bloqueó el primer render de toda la app
  con otra pantalla de carga solo por esto.
- Tokens efectivos: si `preference === 'system'`, sigue
  `useColorScheme()`; si no, usa `preference` directo.
- UI: `app/(tabs)/settings.tsx`, sección "Tema" con 3 filas
  (Sistema/Claro/Oscuro), check en la seleccionada.

## Los 5 temas adicionales (agregado 2026-08-30)

`src/theme/tokens.ts` gana 5 exports nuevos (`highContrast`,
`visualRest`, `sepia`, `oled`, `nordic`), copiados literal de
`task-manager/src/App.css` (`:root[data-theme="..."]`) — mismo
criterio que `dark`/`light` desde el inicio de este spec.
`accentInline`/`accentLink`/`accentCode` de desktop no se portan:
`ThemeTokens` no los tiene y ningún componente de mobile distingue
todavía "color de link" o "color de código inline" del acento
general.

`ThemePreference` pasa de `'system'|'light'|'dark'` a la unión de los
8 nombres de `BuiltInTheme` de desktop. Dos tablas de lookup nuevas en
`ThemeContext.tsx`:

- `TOKENS_BY_THEME` — qué `ThemeTokens` usa cada preferencia concreta
  (todo menos `'system'`, que se resuelve aparte).
- `SCHEME_BY_THEME` — si cada tema concreto es fundamentalmente claro
  u oscuro (`sepia` → `'light'`, los otros 4 nuevos → `'dark'`) —
  necesario porque `useThemeScheme()` sigue siendo un booleano
  claro/oscuro (usado solo para el color de íconos de la barra de
  estado en `app/_layout.tsx`), y ahora hay 8 temas concretos en vez
  de 2 que necesitan mapear a ese booleano. Mismo concepto que
  `CustomTheme.base` en desktop, aplicado acá a los temas fijos (que
  no tienen ese campo explícito porque no son records, son un
  `BuiltInTheme` string).

`AsyncStorage` valida contra un array `VALID_PREFERENCES` de las 8
opciones (antes un `if` de 3 comparaciones) — mismo mecanismo de
persistencia que ya existía, solo la validación de "qué string
guardado es válido" cambia de forma.

## UI del selector: mismo patrón que logday-web (agregado 2026-08-30)

`app/(tabs)/settings.tsx` ya tenía un patrón de fila
(ícono+etiqueta+check) muy parecido al `ThemeRow` de
`SettingsSection.tsx` en logday-web — se extendió en vez de
reemplazarse: `OptionRow` gana una `description` opcional (texto
debajo de la etiqueta, mismo lugar que el `desc` de logday-web),
`THEME_PREFERENCES` pasa de 3 a los 8 valores, y dos mapas explícitos
nuevos (`THEME_LABEL_KEY`/`THEME_DESC_KEY`) reemplazan la
construcción dinámica de la clave i18n (`theme${capitalize(pref)}`),
que ya no alcanzaba con nombres con guion como `'high-contrast'`
(hubiera producido la clave inválida `themeHigh-contrast`).

Íconos elegidos para calzar 1:1 con `THEME_OPTIONS` de logday-web
(`Monitor`/`Sun`/`Moon`/`TriangleAlert`/`Eye`/`BookOpen`/`Smartphone`/
`Snowflake`) — cambia el ícono de "Sistema" de `Smartphone` a
`Monitor` (libera `Smartphone` para "OLED", mismo ícono que usa
logday-web ahí). No se replicó la grilla de recuadros de Logday
Desktop — logday-web ya había descartado esa opción para mobile con
una razón documentada directamente en su código ("en mobile una
grilla de 3 columnas deja cada opción muy chica para tocar, y solo
mostraba la descripción de la opción activa en vez de las 8 a la
vez"), razón que aplica igual o más a una pantalla de teléfono.

## Logo adaptable al tema (agregado 2026-08-30)

`src/components/LogoMark.tsx` (nuevo) — puerto exacto del ícono SVG
inline que ya usa el sidebar de desktop
(`task-manager/src/components/sidebar/Sidebar.tsx`, ~línea 502):
cuadrado redondeado + documento blanco + esquina doblada + línea de
tendencia, con los 3 elementos de acento tomando `fill`/`stroke` de
`var(--accent)`. La versión mobile usa `react-native-svg` (`Svg`,
`Rect`, `Path`, ya una dependencia — lucide-react-native se apoya en
la misma librería) con `theme.accent` en el mismo lugar — se re-evalúa
solo con re-renderizar, así que los 8 temas (y cualquier tema futuro)
quedan cubiertos automáticamente sin agregar un asset de imagen por
tema.

Reemplaza `assets/logo-mark.png` (imagen estática, colores fijos,
eliminada del repo — sin otras referencias) usado antes como
`headerLeft` en `app/(tabs)/_layout.tsx`.

## Header nativo: sombra y tipografía (agregado 2026-08-30)

Ajuste menor relacionado, mismo pedido de "los headers no tienen el
sistema de diseño correctamente agregado": se agregó
`headerShadowVisible: false` + `headerTitleStyle` (peso 700, 17px) a
`screenOptions` de `Tabs` (`app/(tabs)/_layout.tsx`) y `Stack`
(`app/_layout.tsx`), reemplazando la sombra de elevación nativa por
defecto (no coincide con el resto de la app, que usa bordes planos de
1px) por algo más cercano al lenguaje visual del resto de la UI.
`Tabs` además gana un borde inferior explícito
(`headerStyle.borderBottomWidth`/`borderBottomColor`) porque su header
es JS (`@react-navigation/elements`, acepta `ViewStyle` completo);
`Stack` usa native-stack, cuyo `headerStyle` solo acepta
`backgroundColor` — no soporta bordes manuales, así que ahí
`headerShadowVisible: false` es la única palanca disponible.

## Explícitamente pendiente

- Temas personalizados (`CustomTheme`) — ver "Fuera de este spec" en
  requirements.md.
- Verificación en vivo (agregado 2026-08-30): los 5 temas nuevos se
  ven completos (fondo/texto/acento coherentes, sin colores que se
  quedaron del tema anterior); el logo cambia de color al cambiar de
  tema sin necesidad de recargar la app; la sección "Tema" de Ajustes
  muestra las 8 filas con su descripción y el check en la correcta;
  el header nativo (barra superior de los 5 tabs y de las pantallas
  modales) ya no muestra la sombra por defecto.
- Pendiente separado, todavía sin decidir con el usuario: unificar la
  fila de controles que va justo debajo del header nativo en las 4
  pantallas de entidad (Tasks/Notes tienen `ViewSwitch`, Dailys tiene
  botones de ausencia, Overtime no tiene nada) — es la otra mitad del
  pedido original sobre "headers", no tocada en este checkpoint (la
  conversación giró hacia logo/temas antes de confirmarla).
