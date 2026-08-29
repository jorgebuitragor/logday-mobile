# Arquitectura inicial — Diseño

Estado: en diseño. Decisiones de stack tomadas 2026-08-29; falta el
scaffold inicial.

## Stack: React Native + Expo (decidido)

Expo (managed/EAS): onboarding más rápido, OTA updates, build en la
nube sin Xcode/Android Studio configurados localmente. Coherente con
que el resto del ecosistema (`task-manager`) prioriza ligereza de
mantenimiento sobre control fino. Si en el futuro aparece un requisito
concreto que Expo no pueda cubrir (ej. una librería CRDT sin binding
RN/Expo-compatible), se evalúa un dev client o eject parcial en ese
momento — no se descarta Expo preventivamente.

## Estructura de repo: standalone (decidido)

Repo separado (`logday-mobile`, como está creado ahora), coherente con
que `logday-server` y `task-manager` también son repos separados. Los
tipos y el protocolo de sync se re-implementan en `logday-mobile` a
partir del contrato de `logday-server` (OpenAPI, `openapi.yaml`) — no
se porta el código TS de `task-manager` directamente, porque es Tauri
(Vite + React web), no RN, y el ahorro real de compartir código entre
esos dos targets es limitado. Revisar esta decisión si en la práctica
duplicar los tipos genera fricción real.

## Almacenamiento local: SQLite embebido (decidido)

`expo-sqlite` (u `op-sqlite` si `expo-sqlite` no alcanza en
performance) — coherente con que `logday-server` también usa SQLite,
facilita razonar sobre el esquema en ambos lados. Se descarta
WatermelonDB: la capa reactiva no se justifica para el alcance del
MVP, y agrega una abstracción propia sobre el motor base sin un
beneficio concreto identificado todavía.

## Sync con logday-server

Reutiliza el protocolo ya definido en
`logday-server/specs/sync-incremental/` y `lww-por-campo/` — no se
diseña un protocolo nuevo aquí. El trabajo específico de este cliente
es:

1. Implementar el mismo flujo de auth que `task-manager` (`sync_request`
   equivalente, cacheo de token) — ver
   `task-manager/specs/sync-servidor/` como referencia de diseño, no
   como código a portar literalmente (es Rust/Tauri, no aplica a RN).
2. Cliente HTTP contra `GET /sync/changes` (paginado) y los endpoints
   de escritura LWW-por-campo / CRDT (`POST /notes/:id/content`, etc.)
   documentados en `openapi.yaml`.
3. Mapeo del esquema local (SQLite en el dispositivo) al contrato del
   servidor — mismo criterio de `user_id` + `updated_at` + soft-delete
   por tabla que ya usa el servidor.

**Bloqueado (decidido 2026-08-29):** implementar el cliente de sync
real en móvil espera a que `task-manager` (desktop) quede validado
end-to-end, respetando el orden de integración ya decidido en
`logday-server`. Mientras tanto, `logday-mobile` avanza en scaffold,
entidades locales y UI en modo 100% local-first (sin sync), que de
todas formas es el requisito base del sistema.

## MVP: alcance de entidades (decidido)

MVP inicial: `Task`, `Note`, dailys, `OvertimeEntry` — mismo set que
`task-manager` menos calendario/ausencias. `CalendarEvent` y
`AbsenceDay` quedan para una fase posterior, una vez el core funcione
bien en móvil, para mantener el MVP chico y rápido de validar.

## Explícitamente pendiente (specs futuros)

- Esquema de pantallas/navegación.
- Esquema de datos local (tablas SQLite) para `Task`, `Note`, dailys,
  `OvertimeEntry`.
- Diseño de la fase 2 (`CalendarEvent`/`AbsenceDay`).
