# Papelera — Tareas

Estado: implementado, pendiente confirmación en vivo.

- [x] `src/db/trash.ts`: listar, restaurar, eliminar para siempre,
      vaciar y purga a los 60 días con interruptor.
- [x] `restore*` por entidad y `src/lib/syncRestore.ts`;
      `syncQueue.cancelPendingDeletes`/`hasPendingWrites` y
      `contentSyncQueue.hasPending`.
- [x] Aviso "Eliminado · Deshacer" (`UndoToast`) en todos los borrados:
      listas y detalle de tareas, notas, dailys (también el mes),
      horas extra y ausencias.
- [x] Pantalla `app/settings/trash.tsx` y fila en Ajustes; purga al
      abrir en `app/_layout.tsx`.
- [x] Las respuestas tardías ya no reviven lo borrado; los borrados
      toman el candado de la entidad.
- [x] Pruebas: `src/db/trash.test.ts` (20), contra un servidor falso que
      borra en blando y revive con un create. Cada arreglo tiene una
      prueba que falla sin él: el chequeo de fila borrada en
      `apply*Response`, la cancelación del borrado pendiente, el estado
      local del daily (con update vacío se pierde lo escrito sin red) y
      la nota sin reenviar el CRDT (reenviándolo, el texto se duplica).
- [ ] Checkpoint en vivo contra un servidor real con Desktop y Web
      abiertos: borrar y restaurar cada entidad desde el teléfono y
      comprobar en los dos clientes que vuelve sin texto duplicado;
      borrar en Web y restaurar desde el teléfono; borrar sin conexión,
      restaurar y reconectar.
- [x] En Expo Go, en el simulador de iOS (iPhone 17, iOS 26.1, manejado
      con Maestro, 11 nov 2026): crear una tarea, borrarla desde el detalle,
      ver el aviso "Eliminado · Deshacer", deshacer, restaurarla desde la
      papelera y eliminarla para siempre (la fila desaparece de SQLite).
      Salieron y se corrigieron tres cosas: la papelera abierta no se
      actualizaba tras "Deshacer", los diálogos de borrar decían "no se
      puede deshacer" y el subtítulo no concordaba en género ("Nota ·
      eliminado") y se cortaba. Sin probar en Android ni con sync real.
