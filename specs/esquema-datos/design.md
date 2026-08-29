# Esquema de datos local — Design

Estado: implementado (baseline). Ver `src/db/schema.ts` (fuente de
verdad — este documento la explica, no la reemplaza) y
`src/db/index.ts` (inicialización).

## Motor y ejecución

SQLite embebido vía `expo-sqlite` (decidido en
`arquitectura-inicial/design.md`). `src/db/index.ts` abre una única
conexión (`openDatabaseSync('logday.db')`, singleton en memoria del
módulo) y corre `SCHEMA_SQL` completo con `execAsync` al arrancar —
todas las sentencias usan `CREATE TABLE IF NOT EXISTS`, así que correr
el esquema en cada arranque es idempotente y hace de "migración cero":
no hace falta un runner de migraciones mientras solo exista una
versión del esquema. Cuando el esquema cambie por primera vez (agregar
una columna, por ejemplo), ahí sí hay que introducir un mecanismo real
de versionado — no antes.

## Tablas

Mapeo 1:1 con `logday-server/specs/esquema-datos/design.md`, quitando
`user_id`/`seq` (no aplican todavía, ver `requirements.md`) y
`content_crdt` (ver sección CRDT abajo).

### `tasks`

| Columna | Tipo | Nota |
|---|---|---|
| id | TEXT PK | UUID generado en el dispositivo |
| title | TEXT NOT NULL | |
| task_code | TEXT NULL | |
| status | TEXT CHECK IN ('todo','in-progress','done') | |
| tags | TEXT (JSON array) | default `'[]'` |
| project | TEXT | string plano, default `''` |
| created | TEXT (fecha) | |
| completed_at | TEXT NULL | |
| due | TEXT NULL | |
| content | TEXT | markdown, default `''` |
| updated_at | TEXT NOT NULL | bookkeeping para sync futuro |
| deleted_at | TEXT NULL | soft-delete |

### `notes`

| Columna | Tipo | Nota |
|---|---|---|
| id | TEXT PK | UUID |
| title | TEXT NOT NULL | |
| folder | TEXT | string plano, default `''` |
| tags | TEXT (JSON array) | default `'[]'` |
| created | TEXT | |
| updated | TEXT NOT NULL | fecha de negocio, distinta de `updated_at` |
| pinned | INTEGER (0/1) | SQLite no tiene boolean nativo |
| content | TEXT | markdown plano — ver nota CRDT abajo |
| updated_at | TEXT NOT NULL | |
| deleted_at | TEXT NULL | |

### `daily_entries`

Clave natural `date` (sin `id` propio, mismo patrón que el servidor).

| Columna | Tipo | Nota |
|---|---|---|
| date | TEXT PK | `YYYY-MM-DD` |
| content | TEXT | default `''` |
| updated_at | TEXT NOT NULL | |
| deleted_at | TEXT NULL | |

### `overtime_entries`

| Columna | Tipo | Nota |
|---|---|---|
| id | TEXT PK | UUID |
| fecha | TEXT NOT NULL | |
| solicitada_por | TEXT | default `''` |
| actividad | TEXT | default `''` |
| observaciones | TEXT | default `''` |
| hora_inicio | TEXT NOT NULL | `HH:MM` |
| hora_final | TEXT NOT NULL | `HH:MM` |
| total_horas | REAL | default `0` |
| extras_diurnas | REAL | default `0` |
| extras_nocturnas | REAL | default `0` |
| extras_diurnas_festivas | REAL | default `0` |
| extras_nocturnas_festivas | REAL | default `0` |
| updated_at | TEXT NOT NULL | |
| deleted_at | TEXT NULL | |

### `overtime_month_meta`

Clave natural `year_month` (sin `id` propio, mismo patrón que el
servidor).

| Columna | Tipo | Nota |
|---|---|---|
| year_month | TEXT PK | `YYYY-MM` |
| colaborador | TEXT | default `''` |
| cedula | TEXT | default `''` |
| updated_at | TEXT NOT NULL | |
| deleted_at | TEXT NULL | |

## CRDT: pospuesto a propósito

`logday-server` usa CRDT (`Deln0r/ygo`) para `Note.content` y el
contenido de `daily_entries`, para que ediciones concurrentes offline
en dos dispositivos se mezclen en vez de que una pise a la otra. En
`logday-mobile` ese campo es `TEXT` plano porque **todavía no hay
cliente de sync real** — sin sync, no hay "ediciones concurrentes en
dos dispositivos" que resolver, así que CRDT no tiene nada que hacer
por ahora y agregarlo sería trabajo especulativo.

Cuando se implemente el cliente de sync (bloqueado hasta que
`task-manager` quede validado, ver `arquitectura-inicial/design.md`),
ese trabajo debe:

1. Evaluar una librería CRDT wire-compatible con Yjs para
   JS/TypeScript/React Native (`yjs` es la implementación de
   referencia; confirmar en ese momento si corre bien en Hermes/RN sin
   parches, no asumirlo hoy).
2. Migrar `notes.content` y `daily_entries.content` de `TEXT` a un
   formato que guarde el estado CRDT compactado (paralelo a
   `content_crdt BLOB` del servidor).

No se investiga la librería concreta en este spec — es trabajo del
spec de sync futuro, no de este.

## Convenciones compartidas con el esquema del servidor

- Enums como `TEXT CHECK` en vez de tipos nativos (SQLite no tiene
  enums de todas formas, pero la forma de escribir el `CHECK` es la
  misma que en Postgres del lado servidor).
- `tags` como JSON serializado en `TEXT`, sin normalizar a tabla propia
  — mismo criterio que el servidor: es una lista corta editada con
  poca frecuencia.
- Fechas y timestamps como `TEXT` (ISO 8601) — SQLite no tiene tipo
  `DATE`/`TIMESTAMPTZ` nativo, y usar `TEXT` con formato ISO 8601 es
  ordenable lexicográficamente y compatible con lo que ya usa el
  servidor.

## Explícitamente pendiente

- Formato/librería CRDT concreta para `notes`/`daily_entries.content`
  — se resuelve junto con el spec de sync real, no aquí.
- Índices más allá de las primary keys — no hay evidencia de que hagan
  falta con el volumen de datos de un solo usuario en un dispositivo;
  se agregan si un caso de uso concreto lo pide.
