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

## Explícitamente pendiente

- Los 5 temas adicionales de desktop.
- Temas personalizados.
