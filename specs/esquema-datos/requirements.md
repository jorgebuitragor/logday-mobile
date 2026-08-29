# Esquema de datos local — Requirements

Estado: implementado (baseline) — documenta el esquema ya escrito en
`src/db/schema.ts` como reverse-spec, no es aspiracional.

## Contexto

`logday-mobile` necesita almacenamiento local propio y completo desde
el día uno (filosofía local-first, ver
`arquitectura-inicial/requirements.md`), sin depender de que exista un
servidor de sync configurado. Este spec cubre el esquema SQLite del
dispositivo para las 4 entidades del MVP (`Task`, `Note`, dailys,
`OvertimeEntry`) — no el esquema del servidor (ya documentado en
`logday-server/specs/esquema-datos/`).

## Requisitos (EARS)

### Cobertura de entidades

- El sistema DEBERÁ persistir localmente las entidades del MVP:
  `tasks`, `notes`, `daily_entries`, `overtime_entries`,
  `overtime_month_meta` — mismo alcance decidido en
  `arquitectura-inicial/requirements.md`.
- El sistema NO DEBERÁ incluir tablas para `CalendarEvent`/`AbsenceDay`
  hasta que se decida explícitamente la fase 2 (ver
  `arquitectura-inicial/design.md`).

### Compatibilidad futura con el sync (sin implementarlo todavía)

- Cada tabla DEBERÁ tener `updated_at` y `deleted_at` (soft-delete)
  desde ya, aunque el cliente de sync real todavía no exista — para no
  requerir una migración de esquema cuando se implemente (bloqueado
  hasta que `task-manager` quede validado, ver
  `arquitectura-inicial/design.md`).
- El sistema NO DEBERÁ incluir `user_id` ni `seq` en el esquema local
  — son bookkeeping de servidor/sync que no tiene sentido en un
  dispositivo de un solo usuario sin sync activo todavía. Se agregan
  cuando se implemente el cliente de sync real, no antes.
- Los identificadores DEBERÁN ser generados por el dispositivo
  (UUID para `tasks`/`notes`/`overtime_entries`), nunca por un
  servidor — mismo requisito heredado del ecosistema.

### Portabilidad del esquema

- Los enums (`status` en `tasks`) DEBERÁN guardarse como `TEXT` +
  `CHECK`, igual que en `logday-server`, para no divergir si en algún
  momento se valida el mismo dato en ambos lados.
- Los campos tipo lista (`tags`) DEBERÁN guardarse como `TEXT` con JSON
  serializado, no como tabla normalizada — mismo criterio que el
  servidor.

## Diferencia deliberada con el esquema del servidor

- `logday-server` usa CRDT (`content_crdt BLOB`) para `Note.content` y
  el contenido de `daily_entries`. El esquema local de `logday-mobile`
  guarda ese contenido como `TEXT` plano — **no** implementa CRDT
  todavía, porque no hay cliente de sync real que lo requiera. Ver
  `design.md` para el plan de migración cuando llegue ese momento.

## Fuera de este spec

- Esquema de auth/sesión (no aplica: sin servidor de sync configurado,
  no hay sesión que persistir todavía).
- Migraciones — con una sola versión de esquema hasta ahora, no hace
  falta un sistema de migraciones formal (ver `design.md`).
