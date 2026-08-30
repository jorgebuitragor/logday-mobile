# Navegación — Requirements

Estado: implementado, pendiente de confirmación en vivo por el
usuario. Sección "Transiciones" (2026-08-30) también implementada,
pendiente de confirmación en vivo.

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
- El sistema DEBERÁ exponer secciones de primer nivel como **tabs
  inferiores**, no drawer/menú lateral — decidido con el usuario
  2026-08-29. Originalmente 4 (Tasks, Notes, Dailys, Overtime); se
  agregó un 5º tab **Ajustes** el mismo día al construir el selector
  manual de tema/idioma (ver `pantalla-ajustes/`) — no ameritó volver
  a preguntar por el patrón de navegación en sí (tabs), solo agregó
  una entrada más.

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

## Requisitos (EARS) — Transiciones (agregado 2026-08-30)

Pedido directo del usuario: "Puedes añadir animaciones al cambiar de
pantallas. Muy sutiles, pero notorias. Además se ve un detalle blanco
al entrar en pantallas de detalles para extras, notas, Dailys, etc."

- Cambiar de tab (Tareas/Notas/Dailys/Extras/Ajustes) DEBERÁ animar
  con una transición sutil — no un corte instantáneo, pero tampoco un
  desplazamiento llamativo.
- Entrar a cualquier pantalla de detalle presentada como modal
  (`task/new`, `task/[id]`, `note/new`, `note/[id]`, `daily/[date]`,
  `overtime/new`, `overtime/[id]`) NO DEBERÁ mostrar un destello de
  fondo blanco durante la transición, en ningún tema (incluidos los
  oscuros, donde el contraste contra blanco es más notorio).
