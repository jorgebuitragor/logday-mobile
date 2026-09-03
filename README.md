# Logday Mobile

Cliente móvil (React Native) de Logday. Aplicación de gestión personal de
trabajo diario — tareas, notas, dailys y horas extra — con soporte de
sync opcional contra [`logday-server`](https://github.com/jorgebuitragor/logday-server).

Estado: en diseño. Ver `specs/arquitectura-inicial/` antes de tocar código.

## Ecosistema Logday

- **`logday-server`** — API self-hosted (Go) que sirve de backend de sync
  opcional. LWW por campo + CRDT para texto largo ya implementado
  (v1.1.0).
- **`task-manager`** (Logday Desktop) — cliente de escritorio (Tauri +
  React), 100% local-first, con sync por git como mecanismo actual.
  Migración al sync vía `logday-server` en progreso.
- **`logday-mobile`** (este repo) — cliente móvil, nuevo.

## Filosofía

Mismo principio local-first que el resto del ecosistema (ver
`logday-server/specs/arquitectura-inicial/requirements.md`): la app debe
ser 100% funcional sin servidor de sync configurado nunca. El servidor es
un nodo de sincronización opcional, no la autoridad de los datos.

## Licencia

[AGPL-3.0-or-later](./LICENSE).
