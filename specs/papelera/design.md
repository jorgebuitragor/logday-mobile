# Papelera — Design

## Piezas

- `src/db/trash.ts`: listar (una consulta por tabla sobre
  `deleted_at IS NOT NULL`, ordenado en JS con `Date.parse` porque
  `deleted_at` viene del teléfono o del servidor, con o sin
  milisegundos), restaurar (despacha a `restore*` de cada entidad),
  eliminar para siempre, vaciar y la purga.
- `restoreTask`, `restoreNote`, `restoreDailyEntry`,
  `restoreOvertimeEntry` y `restoreAbsenceDay` en `src/db/*`: limpian
  `deleted_at` bajo el candado de la entidad y lanzan el envío. Devuelven
  `{ restored, synced }`: la pantalla no espera `synced`; las pruebas sí.
- `src/lib/syncRestore.ts`: el envío común de restaurar.
- `src/lib/trashEvents.ts` + `src/components/UndoToast.tsx`: el aviso de
  "Deshacer", montado una vez en `app/_layout.tsx`. Las pantallas llaman
  `announceTrashed` después de borrar; borrar un mes de dailys lo anuncia
  con todas sus fechas.
- `app/settings/trash.tsx`: la vista, con el interruptor de la purga.
  Restaurar emite `emitRemoteChange`, así que las listas abiertas
  recargan igual que con el pull.

## Restaurar con sync

El borrado del servidor es blando y no toca el CRDT. Un `create` con el
mismo id revive la fila (`ON CONFLICT ... deleted_at = NULL`). Mismo
criterio que la papelera de Web, que ya encontró a la mala que reenviar
el CRDT duplica el texto:

| Entidad | En el servidor |
|---|---|
| Tarea | `create` y después `patch` de todos sus campos LWW: el `create` no toca `field_updated_at`, y sin el `patch` un campo podía quedar sellado con la hora de una edición vieja. |
| Nota | `create` y `patch` de metadata (título, carpeta, tags, anclada, `updated`). **El contenido no se reenvía.** |
| Daily | `PUT` de contenido, que mezcla con el CRDT guardado y limpia `deleted_at`. |
| Horas extra, ausencia | Un `create` del mismo id. |

**Daily: estado local, no update vacío.** Web manda un update vacío. Aquí
se manda el estado CRDT local completo, por dos motivos:
- es el mismo documento que el servidor ya conoce (mismas operaciones),
  no uno nuevo sembrado desde el texto, que es lo que duplicaba en Web;
  la mezcla no agrega nada que el servidor ya tenga;
- la cola de contenido guarda un estado por día que **reemplaza** al
  anterior. Encolar un update vacío borraba lo escrito sin conexión antes
  del borrado (hay una prueba que lo demuestra).

Solo un daily sin estado CRDT (anterior a la Fase 3 del sync) manda el
update vacío, y únicamente si no hay nada en la cola de ese día.

**Orden con la cola.** Antes de enviar, `syncRestore` quita de la cola
el borrado de esa entidad si todavía no salió
(`syncQueue.cancelPendingDeletes`). Sin conexión, o si quedan otras
escrituras en cola para ese elemento, `create` y `patch` se encolan
detrás de ellas (la cola es FIFO); si no, se mandan directo. Si el
borrado ya estaba viajando cuando se canceló, el servidor lo borra
igual, y el siguiente pull lo devuelve a la papelera: no se pierde nada.

## Respuestas tardías que revivían lo borrado

Al probar la papelera apareció un bug previo. `apply*Response` escribía
la fila con `deleted_at = NULL`. Por eso, si borrabas algo mientras su
create o patch viajaba, al llegar la respuesta reaparecía. Pasaba de dos
maneras:
- la respuesta llegaba después del borrado;
- la respuesta leía la fila justo antes del `UPDATE` del borrado, que no
  tomaba el candado de la entidad.

Arreglado así:
- `apply*Response` ya no escribe sobre una fila borrada;
- los borrados toman el mismo candado que `apply*Response` (las ausencias
  no tenían candado y ahora lo tienen);
- el merge de contenido de los dailys ya no limpia `deleted_at`. El pull
  revive la fila antes de mezclar, así que lo sigue haciendo cuando
  corresponde.

## Alternativas descartadas

- **Tabla de papelera con snapshots, como Web (IndexedDB):** no hace
  falta, porque la fila completa ya queda en SQLite.
- **Pedir confirmación además del "Deshacer":** se mantiene la
  preferencia "Confirmar antes de eliminar" tal como estaba; el aviso se
  suma.

## Límites conocidos

- Una nota escrita y borrada sin conexión, y restaurada antes de
  reconectar, depende de que su contenido en cola salga después del
  `create`. Las dos colas drenan en paralelo, igual que antes de la
  papelera.
- Una nota o un daily borrado para siempre: si otro cliente vuelve a
  escribir en él, el servidor lo revive con el CRDT viejo. Es cosa del
  servidor (el borrado blando conserva el CRDT).
