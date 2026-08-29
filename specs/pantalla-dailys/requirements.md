# Pantalla de Dailys — Requirements

Estado: implementado, pendiente de confirmación en vivo.

## Contexto

Tercer spec de pantalla por entidad. A diferencia de Task/Note,
`daily_entries` no tiene `id` propio — clave natural `date`
(`esquema-datos/design.md`), un registro por día, upsert (mismo patrón
`PUT /daily-entries/:date` que usa el servidor, sin `POST` separado).

`task-manager/src/components/daily/DailyEditor.tsx` implementa un
editor de **listas de actividades** (no un bloque de texto libre): cada
línea del daily es un item independiente que se puede añadir, editar
in-line, reordenar (drag-and-drop con mouse) y eliminar, más
funcionalidad adicional (promover actividad a task, sugerencias de
tasks existentes al escribir, menú contextual por actividad, exportar
mes a PDF/Markdown/texto, navegación por calendario mensual). Una
primera versión de esta pantalla en mobile aplanó todo eso a un único
`TextInput multiline` — una simplificación excesiva, corregida en esta
revisión: **se porta el modelo de lista de actividades**, no solo el
valor funcional. Lo que sí se deja deliberadamente fuera se detalla en
"Fuera de este spec".

## Requisitos (EARS)

### Listado

- El tab "Dailys" DEBERÁ mostrar los daily_entries no eliminados y no
  vacíos, ordenados por fecha descendente, con un ícono de estado vacío
  (`CalendarDays`, mismo que usa desktop en `DailyList.tsx`) cuando no
  hay ninguno.
- El sistema DEBERÁ ofrecer un acceso directo a "Hoy" (crea o abre el
  registro del día actual) desde el listado — mismo atajo que
  `addToday`/`todayBtn` en desktop.

### Edición

- El sistema DEBERÁ representar el contenido de un daily como una
  **lista de actividades individuales** (añadir, editar in-line,
  reordenar, eliminar), no como un bloque de texto plano — mismo
  modelo de interacción que `ActivityList` en `DailyEditor.tsx` de
  desktop, adaptado a táctil (ver design.md: botones subir/bajar en
  vez de drag-and-drop con mouse).
- El sistema DEBERÁ mostrar, al editar un día, el registro **anterior
  no vacío** más reciente (panel "Previo") como una lista de
  actividades **igual de editable** que la del día seleccionado — no
  solo de lectura, corrigiendo la limitación de la primera versión.
  Simplificación mantenida frente a desktop: "entrada anterior más
  reciente" en vez de "día hábil anterior respetando festivos
  colombianos" (ver design.md).
- El sistema DEBERÁ permitir reordenar actividades dentro de cada
  panel mediante botones subir/bajar por actividad.
- El sistema DEBERÁ permitir copiar al portapapeles un mensaje
  formateado combinando el día anterior y el de hoy — mismo propósito
  que `copyFormattedTitle`/`buildDailyCopyText` de desktop — y
  mostrar una vista previa de ese texto en pantalla.
- El sistema DEBERÁ permitir eliminar el registro completo del día
  (soft-delete), con confirmación según
  `confirmacion-eliminar/requirements.md`.

## Fuera de este spec

- Drag-and-drop con puntero/mouse para reordenar — se usan botones
  subir/bajar (ver "Contexto" y design.md).
- Promover una actividad a Task.
- Autocompletar/sugerir tasks existentes al escribir una actividad
  (incluida la sintaxis `#codigo-tarea`).
- Menú contextual por actividad (copiar actividad individual).
- Edición multilínea dentro de una sola actividad (Shift+Enter en
  desktop) — el input de actividad en mobile es de una sola línea.
- Navegación por mes/calendario — el listado es una lista plana por
  fecha, no un calendario mensual.
- Exportar mes a PDF/Markdown/texto.
- Cálculo de "día hábil anterior" respetando festivos colombianos —
  se usa "entrada no vacía más reciente" como aproximación.
