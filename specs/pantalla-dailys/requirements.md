# Pantalla de Dailys — Requirements

Estado: implementado, pendiente de confirmación en vivo.

## Contexto

Tercer spec de pantalla por entidad. A diferencia de Task/Note,
`daily_entries` no tiene `id` propio — clave natural `date`
(`esquema-datos/design.md`), un registro por día, upsert (mismo patrón
`PUT /daily-entries/:date` que usa el servidor, sin `POST` separado).

`task-manager/src/components/daily/DailyEditor.tsx` implementa un
editor mucho más rico (lista de actividades con drag-and-drop,
promover actividad a task, sugerencias de tasks existentes,
exportar mes a PDF/Markdown/texto) — **deliberadamente no portado
1:1**: es una UI pensada para mouse/teclado que no tiene un
equivalente táctil directo, y el volumen de trabajo para replicarla
sería desproporcionado frente al resto de esta sesión. Se porta el
**valor funcional central**: referencia al día anterior, contenido
editable de hoy, copiar mensaje formateado, eliminar.

## Requisitos (EARS)

### Listado

- El tab "Dailys" DEBERÁ mostrar los daily_entries no eliminados y no
  vacíos, ordenados por fecha descendente.
- El sistema DEBERÁ ofrecer un acceso directo a "Hoy" (crea o abre el
  registro del día actual) desde el listado — mismo atajo que
  `addToday`/`todayBtn` en desktop.

### Edición

- El sistema DEBERÁ mostrar, al editar un día, el contenido del
  registro **anterior no vacío** más reciente como referencia de solo
  lectura (panel "Previo") — mismo propósito que el panel dual
  Previo/Seleccionado de desktop, simplificado a "entrada anterior más
  reciente" en vez de "día hábil anterior respetando festivos
  colombianos" (reducción deliberada, ver `design.md`).
- El sistema DEBERÁ permitir copiar al portapapeles un mensaje
  formateado combinando el día anterior y el de hoy — mismo propósito
  que `copyFormattedTitle`/`buildDailyCopyText` de desktop.
- El sistema DEBERÁ permitir eliminar el registro del día (soft-delete),
  con confirmación según `confirmacion-eliminar/requirements.md`.

## Fuera de este spec

- Editor de actividades con drag-and-drop, promoción a task,
  sugerencias — ver nota en "Contexto".
- Navegación por mes/calendario — el listado es una lista plana por
  fecha, no un calendario mensual.
- Exportar mes a PDF/Markdown/texto.
- Cálculo de "día hábil anterior" respetando festivos colombianos —
  se usa "entrada no vacía más reciente" como aproximación.
