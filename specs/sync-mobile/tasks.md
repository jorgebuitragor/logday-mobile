# Sync con logday-server — Tareas

Estado: Fase 0 en curso.

## Plan completo (referencia)

1. **Fase 0** — spike de viabilidad de Yjs en Hermes.
2. **Fase 1** — auth + pantalla de conexión (sin sincronizar ninguna
   entidad todavía).
3. **Fase 2** — sync de metadatos LWW: Task, OvertimeEntry,
   OvertimeMonthMeta, AbsenceDay.
4. **Fase 3** — Note y DailyEntry: metadatos (LWW) + contenido (Yjs
   CRDT).
5. **Fase 4** — migración inicial de datos preexistentes.

Cada fase termina en un checkpoint en vivo obligatorio contra un
`logday-server` real antes de avanzar a la siguiente — ver
`design.md` para el detalle de arquitectura de cada una.

## Fase 0 — Spike de Yjs en Hermes

- [x] `yjs` instalado (`npm install yjs`).
- [x] `isomorphic-webcrypto` instalado — dependencia real que falta
      declarar `yjs`/`lib0` para su entry point de React Native
      (encontrado por el bundle de Metro, no adivinado). Ver
      design.md, "Fase 0 — hallazgo real".
- [x] `src/lib/yjsSpike.ts` (temporal): función `runYjsSpike()` — crea
      2 `Y.Doc`, escribe texto en uno, codifica a base64, aplica al
      otro, compara el resultado.
- [x] Botón temporal en Ajustes ("Spike: Yjs en Hermes") que corre
      `runYjsSpike()` y muestra el resultado inline.
- [x] `./node_modules/.bin/tsc --noEmit` sin errores.
- [x] Bundle de Metro pedido directo — falló primero por la
      dependencia faltante (HTTP 500, error de resolución real, no de
      los template strings de Metro), resuelto instalando
      `isomorphic-webcrypto`; segundo intento HTTP 200 sin errores de
      resolución reales.
- [ ] **Checkpoint en vivo**: abrir Ajustes, tocar "Probar Yjs",
      confirmar que muestra "✓ OK — merge correcto..." sin que la
      pantalla truene. Si falla, documentar acá el error exacto antes
      de intentar un fix (candidato ya evaluado y descartado por
      inspección de código: `global.window`/`atob`/`btoa` — ver
      design.md).
- [ ] Tras el checkpoint: borrar `src/lib/yjsSpike.ts`, la sección
      temporal en `app/(tabs)/settings.tsx` y su import.
