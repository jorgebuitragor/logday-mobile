# Specs (SDD)

Este directorio sigue el mismo flujo ligero de Spec-Driven Development
(SDD) que `logday-server` y `task-manager` — sin herramientas externas.

## Estructura

Cada feature vive en su propia carpeta: `specs/<feature-slug>/`, con
hasta tres archivos:

- **`requirements.md`** — qué debe hacer la feature, en formato EARS
  ("Cuando X, el sistema DEBERÁ Y"). Es el contrato.
- **`design.md`** — cómo se implementa: componentes, decisiones y sus
  alternativas descartadas.
- **`tasks.md`** — checklist de implementación, referenciando los
  requirements que cada tarea satisface.

## Convenciones

- Los specs de features **nuevas** se escriben antes de tocar código y
  guían la implementación. Se marcan `Estado: en diseño` o
  `Estado: en progreso`.
- Al modificar una feature ya especificada: actualiza el spec en el
  mismo PR que el código.
- Toda decisión que aún no esté tomada se marca explícitamente como
  **PENDIENTE DE DECISIÓN** — no se asume ni se decide implícitamente
  por omisión.

## Índice de features

| Feature | Estado | Carpeta |
|---|---|---|
| Arquitectura inicial | en progreso | [`arquitectura-inicial/`](./arquitectura-inicial/requirements.md) |
| Esquema de datos local | implementado (baseline) | [`esquema-datos/`](./esquema-datos/requirements.md) |
| Navegación | implementado | [`navegacion/`](./navegacion/requirements.md) |
| Pantalla de Tasks | implementado (pendiente confirmación en vivo) | [`pantalla-tasks/`](./pantalla-tasks/requirements.md) |
| Temas | implementado (pendiente confirmación en vivo) | [`temas/`](./temas/requirements.md) |
| i18n | implementado (pendiente confirmación en vivo) | [`i18n/`](./i18n/requirements.md) |
| Pantalla de Ajustes | implementado (pendiente confirmación en vivo) | [`pantalla-ajustes/`](./pantalla-ajustes/requirements.md) |
| Branding | implementado (pendiente confirmación en vivo) | [`branding/`](./branding/requirements.md) |
| Pantalla de Notes | implementado (CRUD base verificado en vivo; pin/folder/tags pendiente) | [`pantalla-notes/`](./pantalla-notes/requirements.md) |
| Pantalla de Dailys | implementado (pendiente confirmación en vivo) | [`pantalla-dailys/`](./pantalla-dailys/requirements.md) |
| Pantalla de Overtime | implementado (pendiente confirmación en vivo) | [`pantalla-overtime/`](./pantalla-overtime/requirements.md) |
| Confirmación antes de eliminar | implementado (pendiente confirmación en vivo) | [`confirmacion-eliminar/`](./confirmacion-eliminar/requirements.md) |
| Acciones desde la lista | implementado (pendiente confirmación en vivo) | [`acciones-lista/`](./acciones-lista/requirements.md) |
| Búsqueda global | implementado (pendiente confirmación en vivo) | [`busqueda/`](./busqueda/requirements.md) |
| Selector de fecha | implementado (pendiente confirmación en vivo) | [`selector-fecha/`](./selector-fecha/requirements.md) |
