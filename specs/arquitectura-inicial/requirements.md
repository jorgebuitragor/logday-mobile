# Arquitectura inicial — Logday Mobile

Estado: en diseño.

## Contexto

`logday-mobile` es un nuevo cliente móvil (React Native) para el
ecosistema Logday. Hoy existen:

- `logday-server`: API self-hosted (Go), backend de sync opcional.
  LWW por campo + CRDT para texto largo en `Note.content` /
  `daily_entries.content` ya implementado y liberado (`v1.1.0`).
- `task-manager` (Logday Desktop): único cliente con usuarios reales
  hoy, 100% local (Tauri, archivos locales). Su migración del sync por
  git al sync vía `logday-server` está **en progreso, sin confirmar
  end-to-end** (ver `task-manager/specs/sync-servidor/tasks.md`,
  sección "Punto de retomada").

**Orden de integración (decidido 2026-08-29):** `logday-server/specs/arquitectura-inicial/design.md`
ya decidió que el orden de integración de clientes es desktop primero,
validando el protocolo completo con datos reales antes de invertir en
clientes nuevos (web/móvil/extensión). Se confirmó respetar ese
orden: la implementación del cliente de sync real en `logday-mobile`
espera a que `task-manager` quede validado end-to-end. El resto de
este spec (scaffold, entidades locales, UI 100% local-first) avanza en
paralelo sin esa dependencia.

## Requisitos (EARS)

### Filosofía local-first (heredada, no negociable)

- El sistema DEBERÁ permitir que la app funcione de forma 100% local y
  completamente funcional sin configurar jamás un servidor de sync.
- Ninguna funcionalidad de la app DEBERÁ quedar bloqueada o degradada
  por la ausencia de un servidor de sync configurado.
- Cuando la app realice una escritura, el sistema DEBERÁ persistir el
  cambio localmente de inmediato, sin esperar confirmación del
  servidor.
- Los identificadores de entidades DEBERÁN generarse del lado del
  cliente, nunca asignados por el servidor.

### Paridad funcional con el resto del ecosistema

- El sistema DEBERÁ soportar, en el MVP, las entidades `Task`, `Note`,
  entradas diarias (dailys) y `OvertimeEntry` — mismo set que
  `task-manager` menos calendario/ausencias.
- `CalendarEvent` y `AbsenceDay` NO DEBERÁN considerarse parte del MVP
  — quedan para una fase posterior (decidido 2026-08-29, ver
  `design.md`).
- El sistema DEBERÁ usar el mismo protocolo de sync incremental que
  `logday-server` ya expone (`GET /sync/changes` con paginación
  opcional, LWW por campo, CRDT para texto largo) — no un protocolo
  distinto por cliente.

### Sync con logday-server (cuando esté habilitado)

- Cuando el usuario configure un servidor de sync, el sistema DEBERÁ
  autenticarse y cachear el token localmente, de forma que la app siga
  funcionando offline indefinidamente tras el primer login (solo se
  pausa el sync, no la app) — mismo comportamiento ya decidido para el
  ecosistema.
- El sistema DEBERÁ reconciliar su estado al reconectar usando el
  mismo mecanismo de sync incremental que un cliente en tiempo real,
  no un sistema paralelo.

## Fuera de este spec (para specs futuros)

- Detalle de pantallas/UI y navegación.
- Esquema de datos local (tablas SQLite) para las entidades del MVP.
- Diseño de la fase 2 (`CalendarEvent`/`AbsenceDay`).
