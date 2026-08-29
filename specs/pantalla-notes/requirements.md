# Pantalla de Notes — Requirements

Estado: en diseño.

## Contexto

Segundo spec de pantalla por entidad, mismo patrón que
`pantalla-tasks/`. Reemplaza el placeholder de conteo del tab Notes
por CRUD real.

## Requisitos (EARS)

### Listado

- El tab "Notes" DEBERÁ mostrar la lista real de notas no eliminadas
  (`deleted_at IS NULL`), ordenadas por `updated` descendente (fecha
  de negocio, no `updated_at` de bookkeeping — mismo criterio que
  usaría cualquier lista de notas: la más editada recientemente
  primero).
- Cada fila DEBERÁ mostrar al menos título y una vista previa corta
  del contenido.
- El sistema DEBERÁ ofrecer una acción visible para crear una nota
  nueva desde el listado.

### Creación y edición

- El sistema DEBERÁ permitir crear/editar una nota con: título
  (obligatorio) y contenido (opcional, markdown plano).
- El sistema NO DEBERÁ exponer `folder`/`tags`/`pinned` en el
  formulario de esta fase — misma reducción de alcance deliberada que
  `pantalla-tasks/` con `project`/`tags`; quedan en su valor default.
- Al guardar, el sistema DEBERÁ generar el `id` en el dispositivo
  (UUID), y setear `created`/`updated`/`updated_at` al momento de
  creación; en edición, actualizar `updated`/`updated_at`.
- El sistema DEBERÁ permitir marcar una nota como eliminada
  (soft-delete), no borrarla físicamente.

## Fuera de este spec

- `folder`/`tags`/`pinned` editables.
- Editor de texto enriquecido — contenido es texto plano por ahora
  (mismo criterio que `esquema-datos/design.md`: sin CRDT todavía, sin
  cliente de sync).
- Cualquier lógica de sync.
