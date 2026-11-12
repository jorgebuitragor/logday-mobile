# Notificaciones de vencimientos — Requirements

Estado: implementado (pendiente confirmación en un build propio).

## Contexto

Parte de las funciones nuevas de la 1.0 (vault: "Funciones nuevas de
Mobile 1.0 (plan)"). Jorge decidió el 11 nov 2026 un resumen diario
local, sin push. Desktop no tiene esto.

## Requisitos (EARS)

- El sistema DEBERÁ ofrecer en Ajustes un resumen diario de
  vencimientos, **apagado por omisión**, a la hora que elija la persona
  (por omisión las 8:00).
- El permiso de notificaciones (`POST_NOTIFICATIONS` en Android 13+)
  DEBERÁ pedirse al encender el interruptor, nunca al abrir la app. Si
  se niega, el resumen DEBERÁ quedar apagado y la app DEBERÁ explicar
  cómo darlo desde los ajustes del teléfono.
- Cada resumen DEBERÁ decir cuántas tareas vencen ese día y cuántas
  están vencidas ("3 tareas vencen hoy, 1 vencida"). Un día sin ninguna
  de las dos NO DEBERÁ tener resumen.
- El sistema DEBERÁ programar los resúmenes de los próximos 7 días y
  reprogramarlos al abrir la app, al volver al frente, después de cada
  sync y al cambiar una tarea en el teléfono.
- Las notificaciones DEBERÁN ser locales: nada sale del teléfono, sin
  servidor de push ni Firebase.
- Tocar el resumen DEBERÁ abrir el Inicio.
- El sistema NO DEBERÁ usar alarmas exactas (Android 14 las restringe y
  Play pide justificarlas): el resumen puede llegar con unos minutos de
  margen.

## Fuera de este spec

- Avisos por tarea a una hora exacta.
- Notificaciones en Desktop: se pueden llevar después con su plugin.
