# Navegación — Design

Estado: implementado — ver `app/` (fuente de verdad) y
`src/components/EntityCountScreen.tsx`.

## Expo Router: estructura de archivos

Expo Router usa `app/` como raíz de rutas. Estructura elegida:

```
app/
  _layout.tsx        # layout raíz, inicializa la DB una sola vez
  (tabs)/
    _layout.tsx      # define el tab bar (Tasks, Notes, Dailys, Overtime)
    index.tsx         # tab "Tasks"
    notes.tsx          # tab "Notes"
    dailys.tsx          # tab "Dailys"
    overtime.tsx          # tab "Overtime"
```

El grupo `(tabs)` (paréntesis = segmento que no aparece en la URL) es
el patrón estándar de Expo Router para un tab bar — mantiene la opción
abierta de agregar rutas fuera de los tabs más adelante (ej. una
pantalla de detalle a pantalla completa) sin reestructurar.

## Dónde vive `initDb()`

Se mueve la llamada a `initDb()` de `App.tsx` (que Expo Router
reemplaza como entry point) a `app/_layout.tsx` — corre una vez al
montar el layout raíz, antes de que cualquier tab intente leer de la
DB. Mientras `initDb()` no resuelve, el layout raíz muestra un estado
de carga simple; los tabs no se montan hasta que la DB está lista, así
ningún tab necesita su propio manejo de "DB no inicializada todavía".

## Placeholder por tab: conteo de filas reales

Cada pantalla de tab hace un `SELECT COUNT(*)` contra su tabla
correspondiente (`tasks`, `notes`, `daily_entries`,
`overtime_entries`) usando `getDb()` de `src/db`, y lo muestra en
pantalla ("Tasks: 0 registros locales"). Esto es deliberadamente el
placeholder más simple que igual prueba algo real: que Expo Router, la
navegación entre tabs y las queries a `expo-sqlite` funcionan juntos
end-to-end — no un `<Text>Tasks</Text>` estático que no probaría nada
del stack de datos.

## Qué NO se hace en este spec

- No hay pantallas de lista con los datos reales (eso implica
  formularios de creación, que están fuera de alcance — ver
  `requirements.md`).
- No hay navegación anidada dentro de cada tab todavía.
- `App.tsx`, `index.ts` generados por `create-expo-app` se eliminan —
  Expo Router usa su propio entry point (`expo-router/entry`, se
  configura en `package.json`/`app.json`).

## Explícitamente pendiente

- Pantallas de detalle/creación/edición por entidad — specs futuros.
- Decidir si cada entidad necesita su propio stack anidado dentro del
  tab (ej. `(tabs)/tasks/[id].tsx`) cuando llegue el spec de detalle.

## Transición sutil entre tabs: `animation: 'fade'` (agregado 2026-08-30)

`Tabs` (el wrapper de `expo-router` sobre su copia vendorizada de
`@react-navigation/bottom-tabs`) no anima el cambio de pestaña por
defecto — el `screenOptions.animation` acepta `'none' | 'fade' |
'shift'`, y sin especificarlo se comporta como `'none'` (corte
instantáneo, confirmado observando el comportamiento antes de este
cambio). Se eligió `'fade'` (cross-fade corto, sin desplazamiento)
sobre `'shift'` (las pantallas se desplazan levemente a los lados) por
ser la más discreta de las dos con animación real — coincide con "muy
sutiles, pero notorias", el pedido explícito del usuario. Un solo
`screenOptions.animation` en `app/(tabs)/_layout.tsx` cubre las 5
pestañas, no hace falta tocar cada `Tabs.Screen`.

## Flash blanco al entrar a pantallas modal: `expo-system-ui` (agregado 2026-08-30)

Causa raíz: la ventana nativa raíz (la superficie del SO detrás de la
vista de React Native) tiene fondo blanco por defecto y no se
configura en ningún lado del proyecto. En uso normal es invisible
(la vista de RN la cubre por completo), pero durante las transiciones
de navegación nativas (fuera del control directo de React) se asoma un
frame de esa ventana de fondo — visible como un destello blanco,
mucho más notorio en los temas oscuros. `contentStyle` en
`screenOptions` del `Stack` raíz (`app/_layout.tsx`) ya fija el fondo
de cada pantalla, pero eso es la vista de contenido de React, no la
ventana nativa que se asoma brevemente detrás durante la animación —
son dos capas distintas.

Se agregó `expo-system-ui` (`npx expo install expo-system-ui` —
incluido en el set de módulos nativos que trae Expo Go por versión de
SDK, no requiere development build nuevo) y se sincroniza la ventana
nativa con el tema activo en `ThemeProvider`
(`src/theme/ThemeContext.tsx`):

```ts
useEffect(() => {
  SystemUI.setBackgroundColorAsync(tokens.bgBase);
}, [tokens.bgBase]);
```

Vive en `ThemeProvider` (no en `app/_layout.tsx`) porque ahí ya se
resuelven los tokens de los 8 temas — mismo lugar que ya reacciona a
cambios de preferencia de tema, sin necesitar leer el contexto dos
veces en dos archivos distintos. Cubre los 8 temas por igual (no solo
oscuro/claro), incluidos los de fondo no-neutro como sepia.

## Explícitamente pendiente (transiciones)

- Verificación en vivo: cambiar de tab varias veces seguidas y
  confirmar que el fade se siente fluido, no brusco ni con parpadeo;
  entrar a cada una de las 7 pantallas modal (`task/new`, `task/[id]`,
  `note/new`, `note/[id]`, `daily/[date]`, `overtime/new`,
  `overtime/[id]`) en al menos 2 temas distintos (uno oscuro, uno
  claro) y confirmar que no aparece ningún destello blanco; probar
  también cambiando de tema desde Ajustes y confirmando que la
  siguiente navegación ya usa el fondo nuevo (no el anterior, ver que
  el `useEffect` corrió a tiempo).
