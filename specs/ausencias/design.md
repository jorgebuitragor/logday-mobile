# Ausencias — Design

Estado: implementado — ver `src/types/absence.ts`, `src/db/absences.ts`,
`src/lib/absenceLabels.ts`, `src/components/AbsenceModal.tsx`,
`src/components/AbsenceListModal.tsx`, `app/(tabs)/dailys.tsx`.

## Corrección de la investigación previa

`pantalla-dailys/requirements.md` (checkpoint anterior) afirmó "sin
ningún endpoint correspondiente en logday-server, verificado con un
grep sobre el repo del servidor" — ese grep corrió con el `cwd`
reseteado a otro directorio por el tool de shell de esta sesión (bug
conocido de este entorno, ver `CLAUDE.md`/memoria de sesión: "cada
comando necesita su propio `cd /path && ...`"), así que en realidad
no buscó nada. Al re-investigar con la ruta absoluta correcta se
encontró `internal/absence/` completo en `logday-server`: modelo
(`Day` en `models.go`), store con soft-delete y `ChangesSince` para
el feed de `/sync/changes`, y handlers para los 4 endpoints REST. El
servidor nunca fue el bloqueo real.

## Esquema local: `absence_days`

Mismos campos que la tabla del servidor
(`internal/db/migrations/00010_create_absence_days.sql`), sin
`user_id`/`seq` (igual criterio que el resto de `schema.ts` — ver el
comentario al inicio del archivo). `type` es `TEXT` libre, sin
`CHECK` — el servidor sí valida server-side (`validTypes`), pero la
convención de este proyecto (ver `overtimeForm.comp/pay/other`,
mismo caso) es restringir "enums" de texto solo en la UI, no en el
esquema SQLite local.

## `src/db/absences.ts`

`saveAbsenceDay(date, type, note)` es un upsert-por-fecha manual (no
`ON CONFLICT`, porque `date` no es la clave primaria — `id` sí lo
es): busca con `getAbsenceDayByDate` y hace `UPDATE` si existe,
`INSERT` con un `id` nuevo si no — mismo criterio que
`saveAbsenceDay`/`AbsenceModal.tsx` de desktop ("buscar por fecha,
editar en el lugar si existe"), pero ejecutado contra SQLite en vez
de sobre un array en memoria. `saveAbsenceDayRange` es un bucle día
por día sobre la misma función — igual que desktop.

## `AbsenceModal` — confirmación de borrado delegada al padre

A diferencia de desktop (que arma su propio `ConfirmDeleteModal`
dentro del mismo componente), `AbsenceModal` en mobile **no** confirma
el borrado internamente — su prop `onDelete(absence)` solo dispara la
acción y cierra el modal, dejando que quien lo abrió sea dueño de la
confirmación. Mismo patrón ya establecido en este proyecto para
sheets/diálogos (`NoteActionsSheet.onDelete`,
`DailyMonthActionsSheet.onDeleteMonth`): el componente que ofrece la
acción no confirma, la pantalla que lo invoca sí, con su propio
`ConfirmDeleteModal` ya existente para otros borrados de esa pantalla.
Esto permite que **dos consumidores distintos** de `AbsenceModal`
(el botón "Marcar ausencia" del header de Dailys, y la edición
anidada dentro de `AbsenceListModal`) compartan el componente sin
que cada uno tenga que lidiar con la confirmación del otro.

## `AbsenceListModal` — edición anidada, mismo criterio que desktop

Desktop apila `AbsenceModal` dentro de `AbsenceListModal` con
z-index (`Z_MODAL_NESTED`). Mobile hace lo mismo estructuralmente:
`AbsenceListModal` mantiene su propio estado `editingAbsence` y
renderiza `<AbsenceModal>` anidado — RN apila `Modal`s nativos
automáticamente (el más reciente queda arriba), no hace falta gestión
de z-index manual. `AbsenceListModal` también posee su propio
`useConfirmDelete`/`ConfirmDeleteModal` (a diferencia de las hojas de
acciones de notas/dailys/overtime, que delegan hacia arriba) porque
funciona más como una pantalla propia — lista scrolleable con
acciones por fila — que como un menú de opciones fijas; mismo criterio
que ya distingue a `notes.tsx`/`overtime.tsx`/`dailys.tsx` (pantallas,
dueñas de su confirmación) de `NoteActionsSheet` y compañía (menús,
no).

`app/(tabs)/dailys.tsx` pasa `absences` como prop a `AbsenceListModal`
(no lo carga aparte) — única fuente de datos, evita una segunda
consulta duplicada a `listAbsenceDays()`. `onChanged` es el único
canal de vuelta: cualquier guardado/borrado (desde la fila o desde la
edición anidada) llama `reloadAbsences()` en `dailys.tsx`, que
también alimenta el `Map` de insignias del listado principal.

## Insignia en la fila de Dailys

`absenceByDate` (`useMemo` sobre `absences`) — mismo patrón que
`absenceByDate` de desktop, un `Map<fecha, AbsenceDay>`. Vive en la
misma columna a la derecha que la insignia "HOY" (`badgeColumn`,
`alignItems: 'flex-end'`), apiladas si ambas aplican — desktop las
pone una encima de la otra también (`absence` arriba,
`isToday` badge abajo del todo, en `justify-between`).

## Botones del header de Dailys

`CalendarOff`/`ListChecks` (mismos íconos que desktop) en una fila
nueva arriba del listado (`headerRow`) — Dailys no tenía ningún header
propio hasta ahora (a diferencia de Tasks/Notes, que ya tienen un
`ViewSwitch` ahí); se agregó solo para estos 2 botones, no un patrón
más grande.

## Explícitamente pendiente

Ver "Fuera de este spec" en `requirements.md`.
- Verificación en vivo: marcar una ausencia de un día y de un rango;
  confirmar que la insignia aparece en la fila correcta del listado
  de Dailys; abrir "Ver ausencias", editar una desde ahí y confirmar
  que el listado principal se actualiza al cerrar; borrar una
  ausencia desde la fila de la lista y desde dentro de la edición
  anidada; marcar una ausencia para una fecha que ya tenía una
  registrada y confirmar que la edita en vez de duplicarla.
