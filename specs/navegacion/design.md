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
