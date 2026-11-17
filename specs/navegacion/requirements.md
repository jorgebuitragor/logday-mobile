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
  una entrada más. **Desde nov 2026** (ver `inicio/`): la primera
  pestaña es **Inicio**, seguida de Tareas, Notas, Dailys y Extras.
  Ajustes salió de la barra a un engranaje en la cabecera del Inicio,
  junto a la búsqueda (decidido por Jorge el 11 nov 2026). Desde el 17
  nov 2026 el engranaje está en la cabecera de todas las pestañas.

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

## Requisitos (EARS) — Pestañas deslizables (agregado 2026-11-17)

Pedido de Jorge al probar el APK en su teléfono: "Añade ligeras
animaciones para cada cambio de pantalla. Y que se pueda cambiar de
pantalla deslizando de lado como en Facebook o Instagram".

- Deslizar de lado sobre el contenido de una pestaña DEBERÁ pasar a la
  pestaña vecina (Inicio ↔ Tareas ↔ Notas ↔ Dailys ↔ Extras), con la
  página siguiendo el dedo. Tocar la barra de abajo DEBERÁ seguir
  funcionando igual.
- La cabecera (logo, título de la pestaña, búsqueda y Ajustes) y la
  barra de abajo DEBERÁN verse como antes.
- Abrir Ajustes y sus subpantallas DEBERÁ animar con una entrada de
  lado; abrir un formulario, la búsqueda o la captura, con una entrada
  desde abajo con fundido. Las transiciones DEBERÁN ser cortas y
  ligeras.
- Deslizar una fila YA NO DEBERÁ borrarla (el gesto es para cambiar de
  pestaña). Mantener pulsada una fila de Tareas, Dailys o Extras
  DEBERÁ abrir un menú con Eliminar; en Notas, la pulsación larga ya
  abría su menú de acciones, que incluye Eliminar. Eliminar sigue
  pasando por la confirmación opcional y el aviso de deshacer.
  Decisión de Jorge, 17 nov 2026.
