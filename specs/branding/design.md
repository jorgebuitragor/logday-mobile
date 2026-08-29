# Branding — Design

Estado: implementado.

## Assets: generados desde las fuentes de `task-manager`, no desde cero

`task-manager/icon_square.png` (1024×1024, indigo, esquinas
transparentes) e `icon_square_wiout_background.png` (mismo glyph,
fondo transparente) son las fuentes reales de marca (usadas para
generar los íconos de Tauri/iOS/Android de desktop). Generados con
Pillow (`python3`) a partir de esas dos fuentes, sin tocar ningún
asset de `task-manager`:

| Archivo | Origen | Nota |
|---|---|---|
| `assets/icon.png` | `icon_square.png` aplanado sobre blanco | iOS rechaza íconos con canal alfa — se aplanó, ya no es transparente en las esquinas |
| `assets/favicon.png` | mismo aplanado, redimensionado a 48×48 | |
| `assets/android-icon-foreground.png` | `icon_square_wiout_background.png` tal cual | Android aplica su propia máscara, no hace falta aplanar |
| `assets/android-icon-background.png` | generado: `#6366f1` sólido, 1024×1024 | color de acento de marca (`light.accent`/`dark.accentStrong`) |
| `assets/android-icon-monochrome.png` | silueta blanca a partir del canal alfa del glyph | Android 13+ ícono temático, Android lo tiñe él mismo |
| `assets/splash-icon.png` | `icon_square_wiout_background.png` tal cual | mismo glyph transparente que ya traía el template por convención |
| `assets/logo-mark.png` | glyph redimensionado a 256×256 | usado en runtime (headers), no es un ícono de sistema |

## `app.json`

- `userInterfaceStyle` pasó de `"light"` (default del template — ver
  "Bug de detección de tema" abajo) a `"automatic"` en el nivel raíz,
  `ios` y `android`.
- `android.adaptiveIcon.backgroundColor` de `#E6F4FE` (default) a
  `#6366f1` (coherente con `android-icon-background.png`, que ya es
  ese mismo color — el campo es solo fallback si la imagen no carga).

## Íconos de tabs y logo en runtime

`lucide-react-native` (mismo set de íconos que `lucide-react` en
desktop/web, mismos nombres de componente) — mapeo 1:1 con
`task-manager/src/components/sidebar/Sidebar.tsx`:

| Tab | Ícono | Igual que desktop |
|---|---|---|
| Tasks | `CheckSquare` | sí |
| Notes | `Notebook` | sí |
| Dailys | `CalendarDays` | sí |
| Overtime | `Timer` | sí |
| Ajustes | `Settings` | sí |

`app/(tabs)/_layout.tsx`: `tabBarIcon` por `Tabs.Screen`, coloreado
con `theme.accent`/`theme.textMuted` (activo/inactivo) vía el patrón
`({ color, size }) => <Icon color={color} size={size} />` estándar de
React Navigation. `headerLeft` global (`screenOptions`) muestra
`assets/logo-mark.png` en todos los headers de tabs.

## Bug de detección de tema (encontrado al revisar branding)

`userInterfaceStyle: "light"` en `app.json` (default de
`create-expo-app`, nunca tocado hasta ahora) fuerza el `Appearance`
nativo a modo claro sin importar el tema real del SO — explica que el
usuario reportara "mi sistema está en oscuro y lo detecto en claro".
El override manual (Ajustes → Oscuro) funcionaba igual porque no
depende de `useColorScheme()`. Corregido a `"automatic"` en el mismo
cambio que esta spec (ver `app.json` arriba) — no era un bug del
código de `temas/`, sino de configuración nunca ajustada desde el
default del scaffold.

## Bug del tab bar sin traducir al cambiar idioma (encontrado al revisar branding)

`Tabs.Screen options={{ title: t(...) }}` y `Stack.Screen options={{ title: t(...) }}`
no se releían de forma confiable al cambiar `i18n.language` — a
diferencia de `screenOptions` (objeto pasado al Navigator, sí
reactivo en cada render, por eso los colores de tema sí se
actualizaban solos). Arreglado forzando un remount completo del
`<Tabs>`/`<Stack>` con `key={i18n.language}` en
`app/(tabs)/_layout.tsx` y `app/_layout.tsx` — el remount es barato
(5 tabs) y garantiza que todos los títulos se recalculen frescos, sin
depender de que React Navigation propague `options.title` de forma
reactiva desde afuera del árbol de cada pantalla.

## Explícitamente pendiente

- Revisión visual del ícono monocromático (generado automático, sin
  ajuste manual de forma/padding).
- Pantalla de login/splash con branding propio.
