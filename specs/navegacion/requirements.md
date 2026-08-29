# Navegación — Requirements

Estado: implementado, pendiente de confirmación en vivo por el
usuario.

## Contexto

El scaffold inicial (`arquitectura-inicial/`) dejó un solo `App.tsx`
sin navegación real. Este spec cubre la estructura de navegación de
primer nivel para las 4 entidades del MVP (`Task`, `Note`, dailys,
`OvertimeEntry`) — no el diseño detallado de cada pantalla de
creación/edición (eso queda para specs por entidad, fuera de alcance
aquí).

## Requisitos (EARS)

### Librería y estructura

- El sistema DEBERÁ usar **Expo Router** (routing basado en archivos
  bajo `app/`) — decidido con el usuario 2026-08-29, no React
  Navigation manual.
- El sistema DEBERÁ exponer 4 secciones de primer nivel como
  **tabs inferiores**: Tasks, Notes, Dailys, Overtime — decidido con
  el usuario 2026-08-29, no drawer/menú lateral.

### Alcance de esta fase

- Cada tab DEBERÁ renderizar al menos una pantalla placeholder
  funcional (no un stub vacío) que confirme que la navegación y el
  acceso a la DB local funcionan juntos — ej. mostrando el conteo de
  filas locales de esa entidad.
- Este spec NO DEBERÁ incluir formularios de creación/edición ni
  pantallas de detalle — quedan fuera, para specs futuros por entidad.
- Este spec NO DEBERÁ incluir ninguna pantalla de configuración de
  servidor de sync — no aplica todavía (ver
  `arquitectura-inicial/design.md`, cliente de sync bloqueado).

## Fuera de este spec

- Pantallas de detalle/edición por entidad.
- Navegación anidada dentro de cada tab (ej. lista → detalle).
- Onboarding / pantalla de bienvenida.
- Configuración de servidor de sync.
