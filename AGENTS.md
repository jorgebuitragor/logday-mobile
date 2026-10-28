# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# AGENTS.md — Logday Mobile

App de Logday para Android e iOS: Expo SDK 57 (managed), React Native 0.86, Expo Router y TypeScript. `expo-sqlite` es la única fuente de verdad local, y los tokens de sync viven en `expo-secure-store`. El sync con `logday-server` es opcional. El README todavía dice "en diseño", pero la app ya está construida. Repos hermanos en `../`: `logday-server`, `task-manager` (Desktop), `logday-web`.

## Comandos y verificación

- `npm install`, `npm start`: Expo Go por LAN durante el desarrollo.
- No hay pruebas automáticas. Cada cambio se verifica con:
  1. `./node_modules/.bin/tsc --noEmit` (o `npm run typecheck`). No usar `npx tsc`: no muestra salida en este entorno.
  2. `npm run lint`.
  3. Pedir el bundle de Metro de `expo-router/entry` y buscar errores reales de "Unable to resolve module". Ignorar los que aparecen como texto dentro del propio código de errores de Metro.
  4. Que las claves de i18n en español y en inglés sean las mismas.
- CI: typecheck y lint con Node 22.

## Convenciones

- Fechas de calendario ("hoy", vencimientos) con `src/lib/dates.ts` (`todayISO`, `addDaysISO`), en hora local. `toISOString()` solo para instantes (`updated_at`, cola de sync): en Colombia da el día siguiente desde las 7 p. m. Ojo: `created`, `completed_at` y `updated` hoy se guardan como instantes ISO completos, mientras Desktop usa `YYYY-MM-DD` (pendiente de decidir el formato común).
- Los patrones de Desktop y Web se adaptan a React Native, no se copian tal cual.
- Sin store global reactivo para el sync, y SQLite embebido sin WatermelonDB: decisiones registradas en el vault.
- i18n con i18next, español e inglés, nunca voseo.
- Specs SDD en `specs/` (ver `specs/README.md`): el spec se actualiza en el mismo PR que el código.
- Ramas: `feature/<slug>` desde `develop`, con PR a `develop`.

## No hacer sin preguntar a Jorge

- Mergear a `develop` o `main`, crear tags, publicar builds o subir a las tiendas.

## Dónde está el contexto

Vault de Obsidian `~/Developer/Obsidean/logday`, si está disponible: hub `00 Indice/Logday Mobile (hub).md`.
