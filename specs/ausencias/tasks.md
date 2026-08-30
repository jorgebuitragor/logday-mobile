# Ausencias — Tareas

Estado: implementado, pendiente de confirmación en vivo.

- [x] Corrección de investigación: `logday-server/internal/absence/`
      ya tiene los 4 endpoints REST + migración — el gap real era
      solo del lado de mobile, no del servidor (ver design.md).
- [x] `src/types/absence.ts` (nuevo): `AbsenceType`/`AbsenceDay`.
- [x] `src/db/schema.ts`: tabla `absence_days` (mismos campos que la
      migración del servidor, sin `user_id`/`seq`).
- [x] `src/db/absences.ts` (nuevo): `listAbsenceDays`,
      `getAbsenceDayByDate`, `saveAbsenceDay` (upsert por fecha),
      `saveAbsenceDayRange`, `deleteAbsenceDay`.
- [x] `src/lib/absenceLabels.ts` (nuevo): `absenceTypeLabel`.
- [x] `src/components/AbsenceModal.tsx` (nuevo): modo un
      día/rango, selector de tipo, nota; sin confirmación de borrado
      propia (delega al padre, ver design.md).
- [x] `src/components/AbsenceListModal.tsx` (nuevo): lista completa,
      edición anidada (`AbsenceModal` dentro), borrado por fila con su
      propio `ConfirmDeleteModal`.
- [x] `app/(tabs)/dailys.tsx`: `headerRow` con botones "Marcar
      ausencia"/"Ver ausencias"; `absences`/`reloadAbsences`/
      `absenceByDate`; insignia de ausencia en cada fila (`badgeColumn`,
      junto a la insignia "HOY"); `confirmDeleteAbsence` para el
      borrado disparado desde el `AbsenceModal` del header.
- [x] i18n: sección `absence` completa (14 claves) en es/en, sin las
      claves de toast de desktop (mobile no tiene sistema de toasts).
      Paridad verificada (239 = 239).
- [x] `./node_modules/.bin/tsc --noEmit` sin errores.
- [x] Bundle de Metro pedido directo, sin errores de resolución
      (`AbsenceModal`/`AbsenceListModal`/`saveAbsenceDayRange`/
      `absenceTypeLabel` aparecen resueltos).
- [ ] Verificar en vivo: marcar ausencia (un día y rango); insignia en
      el listado de Dailys; editar/borrar desde "Ver ausencias";
      borrar desde dentro de la edición anidada; volver a marcar una
      fecha ya registrada y confirmar que edita, no duplica.
