# Ausencias — Requirements

Estado: implementado, pendiente de confirmación en vivo.

## Contexto

Gap encontrado al revisar `DailyList.tsx` de desktop para
`pantalla-dailys/` (pedido: "revisa que no nos falte algo funcional...
que esté en desktop"). Se reportó inicialmente como "no portado,
requiere servidor nuevo" — **esa afirmación era incorrecta**, causada
por un `grep` que corrió contra un directorio equivocado (el `cwd` de
la sesión se resetea entre comandos de este proyecto). Al pedir el
usuario "incluye las ausencias" se re-investigó a fondo y se
encontró que **`logday-server` ya tiene el endpoint completo**
(`internal/absence/`: `handlers.go`, `store.go`, migración
`00010_create_absence_days.sql`) — el servidor no era el bloqueo,
faltaba solo el lado de mobile. Corregido con el usuario antes de
implementar.

Mismo alcance que el resto de este proyecto hasta ahora (Tasks,
Notes, Dailys, Overtime): **SQLite local, sin sync real todavía**
(mobile no tiene ningún cliente HTTP/sync implementado, ver
`arquitectura-inicial/`) — el esquema y los campos se diseñan para
calzar con lo que el servidor ya espera (mismo criterio que
`overtime_month_meta`), pero no se llama a la API todavía.

## Requisitos (EARS)

- El sistema DEBERÁ permitir marcar un día (o un rango de días) como
  ausencia, con un motivo (`incapacidad`/`vacaciones`/`otro`) y una
  nota opcional — mismos 3 valores que valida `logday-server`
  (`internal/absence/models.go`, `validTypes`).
- Si ya existe una ausencia para la fecha elegida (modo "un día"), el
  sistema DEBERÁ cargarla para editarla en vez de crear una duplicada
  — mismo criterio que `AbsenceModal.tsx` de desktop.
- El sistema DEBERÁ ofrecer una lista de todas las ausencias
  registradas, con edición y borrado por fila.
- El sistema DEBERÁ mostrar, en cada fila del listado de Dailys que
  ya tenga una ausencia registrada para esa fecha, un distintivo con
  el motivo — mismo comportamiento que desktop (el distintivo vive en
  la fila existente, no crea una fila nueva para un día sin daily
  registrado).
- El acceso a "Marcar ausencia" y "Ver ausencias" DEBERÁ estar
  disponible desde la pantalla de Dailys, sin necesidad de abrir un
  día — mismo criterio que los 2 botones del header de
  `DailyList.tsx` en desktop.
- El borrado de una ausencia DEBERÁ pedir confirmación según
  `confirmacion-eliminar/requirements.md`.

## Fuera de este spec

- Sincronización real con `logday-server` — el servidor ya soporta
  `GET/POST/PATCH/DELETE /absence-days`, pero mobile no llama a esos
  endpoints todavía (ningún otro dato de mobile lo hace tampoco, ver
  "Contexto"). Cuando se implemente el cliente de sync, `AbsenceDay`
  ya tiene los mismos campos (`id`, `date`, `type`, `note`,
  `updated_at`, `deleted_at`) que el payload del servidor espera.
- Insignia de ausencia en `TaskCalendarView` u otras vistas de
  calendario — solo se agregó al listado de Dailys, que es donde
  vivía en desktop.
- Notificar/bloquear la creación de un daily o de horas extra en un
  día marcado como ausencia — desktop tampoco lo hace, son conceptos
  independientes.
