# Esquema de datos local — Tareas

Estado: implementado (baseline). Documentado como reverse-spec del
código ya escrito durante el scaffold inicial.

- [x] Definir las 5 tablas del MVP (`tasks`, `notes`, `daily_entries`,
      `overtime_entries`, `overtime_month_meta`) en
      `src/db/schema.ts`, mapeadas 1:1 desde el esquema de
      `logday-server` menos `user_id`/`seq`/CRDT.
      Satisface: "Cobertura de entidades" en `requirements.md`.
- [x] Inicializar el esquema al arrancar la app (`src/db/index.ts`,
      `initDb()` con `execAsync` + `CREATE TABLE IF NOT EXISTS`).
      Verificado en vivo en Android real (SDK 57, ver
      `arquitectura-inicial/tasks.md`): la app carga y muestra "DB
      lista".
      Satisface: requisito de persistencia local desde el día uno en
      `arquitectura-inicial/requirements.md`.
- [ ] Escribir la capa de acceso a datos (funciones CRUD por entidad,
      ej. `src/db/tasks.ts`) — no existe todavía, el esquema por ahora
      solo se crea, no se usa desde ninguna pantalla.
- [ ] Cuando se implemente el cliente de sync real: evaluar librería
      CRDT para `notes`/`daily_entries.content` y migrar de `TEXT`
      plano al formato compactado (ver "CRDT: pospuesto a propósito"
      en `design.md`). Bloqueado por lo mismo que el resto del cliente
      de sync (`arquitectura-inicial/design.md`).
