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
