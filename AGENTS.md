# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# AGENTS.md — Logday Mobile

App de Logday para Android e iOS: Expo SDK 57 (managed), React Native 0.86, Expo Router y TypeScript. `expo-sqlite` es la única fuente de verdad local, y los tokens de sync viven en `expo-secure-store`. El sync con `logday-server` es opcional. Repos hermanos en `../`: `logday-server`, `task-manager` (Desktop), `logday-web`.

## Comandos y verificación

- `npm install`, `npm start`: Expo Go por LAN durante el desarrollo.
- No hay pruebas automáticas. Cada cambio se verifica con:
  1. `./node_modules/.bin/tsc --noEmit` (o `npm run typecheck`). No usar `npx tsc`: no muestra salida en este entorno.
  2. `npm run lint`.
  3. Pedir el bundle de Metro de `expo-router/entry` y buscar errores reales de "Unable to resolve module". Ignorar los que aparecen como texto dentro del propio código de errores de Metro.
  4. Que las claves de i18n en español y en inglés sean las mismas.
- CI: typecheck y lint con Node 22.

## Convenciones

- Fechas (`src/lib/dates.ts`): las de calendario ("hoy", vencimientos, `fecha`, `date`) son `YYYY-MM-DD` en hora local; `created`, `completed_at`/`completedAt` y `updated` son instantes de `toISOString()` (`nowInstant()`), pero los `YYYY-MM-DD` legados siguen siendo válidos: se leen con `parseStamp`, `stampToLocalDate` y `stampSortKey`, nunca con `new Date('YYYY-MM-DD')` ni comparando strings. Contrato en `../logday-server/specs/esquema-datos/requirements.md`. Cuándo se sellan, igual en los 3 clientes: `completed_at` con `nextCompletedAt` (`src/lib/taskCompletion.ts`) y el `updated` de las notas como mucho una vez por minuto al editar contenido (`src/lib/editStampThrottle.ts`).
- Los patrones de Desktop y Web se adaptan a React Native, no se copian tal cual.
- Sin store global reactivo para el sync, y SQLite embebido sin WatermelonDB: decisiones registradas en el vault.
- i18n con i18next, español e inglés, nunca voseo.
- Specs SDD en `specs/` (ver `specs/README.md`): el spec se actualiza en el mismo PR que el código.
- Ramas: `feature/<slug>` desde `develop`, con PR a `develop`.

## No hacer sin preguntar a Jorge

- Mergear a `develop` o `main`, crear tags, publicar builds o subir a las tiendas.

## Dónde está el contexto

Vault de Obsidian `~/Developer/Obsidean/logday`, si está disponible: hub `00 Indice/Logday Mobile (hub).md`.
