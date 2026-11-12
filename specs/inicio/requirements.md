# Inicio — Requirements

Estado: implementado (pendiente confirmación en vivo).

## Contexto

Parte de las funciones nuevas de la 1.0 (vault: "Funciones nuevas de
Mobile 1.0 (plan)"). Un resumen adaptado (no copiado) del Inicio de
Desktop (`DashboardView`). Jorge decidió el 11 nov 2026 que sea la
primera pestaña y que Ajustes salga de la barra a un engranaje en la
cabecera del Inicio.

## Requisitos (EARS)

- El Inicio DEBERÁ ser la primera pestaña. La barra queda en Inicio,
  Tareas, Notas, Dailys y Extras; Ajustes DEBERÁ abrirse desde un
  engranaje en la cabecera del Inicio, junto a la búsqueda.
- El Inicio DEBERÁ mostrar:
  - las tareas vencidas, las que vencen hoy y las que vencen en los
    próximos 6 días (sin las hechas ni las que no tienen fecha);
  - el daily de hoy, para abrirlo, o un acceso para empezarlo;
  - la semana de lunes a domingo, con festivos de Colombia, ausencias y
    horas extra registradas por día;
  - las 5 notas modificadas más recientemente;
  - botones de captura: nueva tarea, nueva nota y horas extra.
- Tocar una tarea, una nota o el daily DEBERÁ abrir su pantalla.
- Sin tareas, notas ni daily de hoy, el Inicio DEBERÁ mostrar una
  bienvenida en vez de tarjetas vacías sin explicación.
- El Inicio DEBERÁ actualizarse con lo que llega por sync mientras está
  abierto, como las demás listas.
- El Inicio solo DEBERÁ leer SQLite: no escribe ni toca el sync.

## Fuera de este spec

- Tarjetas de extensiones de Desktop (`ExtensionHomeCards`): Mobile no
  tiene extensiones.
- "Hechas esta semana" y "en progreso sin fecha" de Desktop: se dejaron
  fuera para que la pantalla quepa en un teléfono sin desplazar mucho.
